import * as cbor from 'cbor';
import * as crypto from 'crypto';
import { exportJWK, calculateJwkThumbprint, importJWK } from 'jose';

// Polyfill Web Crypto for Node.js if needed (Node 20 has it globally usually, but explicit is safer)
const subtle = crypto.webcrypto.subtle;

// Helper: base64url to Uint8Array
function base64UrlToUint8Array(base64Url: string) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
}

// ------------------------------------------------------------------
// 1. SIMULATE WALLET (Encryption Side)
// ------------------------------------------------------------------
async function simulateWallet(clientPublicKeyJwk: any, origin: string) {
  console.log('--- WALLET SIMULATION ---');
  
  // A. Generate Ephemeral Key Pair (Wallet's Key)
  const walletKeyPair = await subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const walletPublicKeyJwk = await subtle.exportKey("jwk", walletKeyPair.publicKey);
  const clientPublicKey = await subtle.importKey(
    "jwk",
    clientPublicKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // B. Derive Shared Secret (Z)
  const sharedSecretBits = await subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    walletKeyPair.privateKey,
    256
  );
  console.log("Wallet: Shared Secret Z (Hex):", Buffer.from(sharedSecretBits).toString('hex'));

  // C. Construct EncryptionInfo (Unwrapped Map)
  // Standard says: EncryptionInfo is a CBOR Map containing nonce and recipientPublicKey (Client's PK)
  const nonce = crypto.randomBytes(32);
  const encryptionInfoMap = new Map();
  encryptionInfoMap.set('nonce', nonce);
  
  // Need to encode Client Public Key as COSE_Key for the map
  // For simulation, we'll just put the JWK x/y in a simplified COSE structure or similar
  // ISO 18013-5 requires COSE_Key format. 
  // We'll trust the Client code handles the exact bytes of what we send.
  // Here we just emulate "some bytes" for the key to ensure round-trip consistency.
  // Actually, let's just use the nonce for the check, as the key is static in the map.
  // Ideally we replicate the exact COSE structure but for salt derivation, 
  // the specific content matters less than the consistency between Handover and Salt.
  // We'll put the Nonce and a placeholder for RecipientKey to match 2 keys.
  encryptionInfoMap.set('recipientPublicKey', Buffer.from('mock-cose-key')); 

  // Encode EncryptionInfo (Unwrapped)
  const encryptionInfoBytes = cbor.encodeCanonical(encryptionInfoMap);
  console.log("Wallet: EncryptionInfo Bytes (Hex):", encryptionInfoBytes.toString('hex'));

  // D. Calculate SessionTranscript
  // Transcript = [DeviceEngagementBytes (null), EReaderKeyBytes (null), Handover]
  // Handover = [EncryptionInfoBytes, Origin]
  const handover = [Buffer.from(encryptionInfoBytes), origin];
  const handoverBytes = cbor.encodeCanonical(handover);
  const sessionTranscript = [null, null, handoverBytes];
  const sessionTranscriptBytes = cbor.encodeCanonical(sessionTranscript);
  console.log("Wallet: SessionTranscript Bytes (Hex):", sessionTranscriptBytes.toString('hex'));

  // E. Derive Session Key (HKDF)
  // Salt = SHA-256(SessionTranscript)
  const saltHash = await subtle.digest("SHA-256", sessionTranscriptBytes);
  const salt = new Uint8Array(saltHash);
  console.log("Wallet: Derived Salt (Hex):", Buffer.from(salt).toString('hex'));

  const sessionKey = await subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: new TextEncoder().encode("SKDevice")
    },
    // Import Shared Secret as Key Material
    await subtle.importKey("raw", sharedSecretBits, "HKDF", false, ["deriveKey"]),
    { name: "AES-GCM", length: 256 }, // Using AES-256 per previous assumption
    true,
    ["encrypt"]
  );

  // F. Derive IV (SIV) (Optional, but usually derived similarly)
  // For simplicity, let's assume standard IV derivation or random IV.
  // ISO 18013-5 uses SIV.
  // key = HKDF(..., "SIVDevice", len=96 bits) -> SIV
  // IV = SIV XOR Counter.
  const sivBits = await subtle.deriveBits(
    {
        name: "HKDF",
        hash: "SHA-256",
        salt: salt,
        info: new TextEncoder().encode("SIVDevice")
    },
    await subtle.importKey("raw", sharedSecretBits, "HKDF", false, ["deriveBits"]),
    96 // 12 bytes
  );
  const siv = new Uint8Array(sivBits);
  const iv = new Uint8Array(12);
  iv.set(siv);
  iv[11] ^= 1; // Counter = 1

  // G. Encrypt Data (Payload matches deviceResponse structure)
  // Structure: [status, [doc...], [error...]] - We'll just encrypt a simple string
  const plaintext = cbor.encodeCanonical("Success!");
  
  const cipherTextBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      additionalData: sessionTranscriptBytes // ADDING AAD!
    },
    sessionKey,
    plaintext
  );

  // Return everything needed for the Client
  return {
    walletPublicKeyJwk,
    encryptionInfoBytes, // The bytes the Wallet sends
    cipherText: new Uint8Array(cipherTextBuffer),
    expectedSalt: Buffer.from(salt).toString('hex')
  };
}

// ------------------------------------------------------------------
// 2. RUN SIMULATION (Client Side)
// ------------------------------------------------------------------
async function runClientVerification() {
  const origin = 'https://localhost';
  
  // A. Generate Client Key Pair
  const clientKeyPair = await subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const clientPublicKeyJwk = await subtle.exportKey("jwk", clientKeyPair.publicKey);

  // B. Run Wallet Simulation
  const { walletPublicKeyJwk, encryptionInfoBytes, cipherText, expectedSalt } = await simulateWallet(clientPublicKeyJwk, origin);

  console.log('--- CLIENT DECRYPTION ---');

  // C. Client: Reconstruct Transcript
  // Assume: Unwrapped Strategy (We received 'encryptionInfoBytes' which IS the map bytes in this sim)
  // In real app, we might check for 'dcapi' wrapper. Here we assume sim sent bare bytes (Standard).
  
  const handover = [Buffer.from(encryptionInfoBytes), origin];
  const handoverBytes = cbor.encodeCanonical(handover);
  const sessionTranscript = [null, null, handoverBytes];
  const sessionTranscriptBytes = cbor.encodeCanonical(sessionTranscript);
  console.log("Client: SessionTranscript Bytes (Hex):", sessionTranscriptBytes.toString('hex'));

  // D. Client: Derive Salt
  const saltHash = await subtle.digest("SHA-256", sessionTranscriptBytes);
  const clientSalt = Buffer.from(saltHash).toString('hex');
  console.log("Client: Derived Salt (Hex):", clientSalt);

  if (clientSalt !== expectedSalt) {
    console.error("FATAL: Salt Mismatch!");
    return;
  } else {
    console.log("SUCCESS: Salt Matches.");
  }

  // E. Client: Derive Key
  const walletPublicKey = await subtle.importKey(
    "jwk",
    walletPublicKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  const sharedSecretBits = await subtle.deriveBits(
    { name: "ECDH", public: walletPublicKey },
    clientKeyPair.privateKey,
    256
  );
  
  const salt = new Uint8Array(saltHash);
  const sessionKey = await subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: new TextEncoder().encode("SKDevice")
    },
    await subtle.importKey("raw", sharedSecretBits, "HKDF", false, ["deriveKey"]),
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"]
  );

  // F. Client: Derive IV
  const sivBits = await subtle.deriveBits(
    {
        name: "HKDF",
        hash: "SHA-256",
        salt: salt,
        info: new TextEncoder().encode("SIVDevice")
    },
    await subtle.importKey("raw", sharedSecretBits, "HKDF", false, ["deriveBits"]),
    96
  );
  const siv = new Uint8Array(sivBits);
  const iv = new Uint8Array(12);
  iv.set(siv);
  iv[11] ^= 1;

  // G. Client: Decrypt
  try {
    const decrypted = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        additionalData: sessionTranscriptBytes // THIS WAS THE MISSING PIECE
      },
      sessionKey,
      cipherText
    );
    console.log("Client: Decrypted successfully!");
    console.log("Client: Decrypted Data:", cbor.decodeFirstSync(new Uint8Array(decrypted)));
  } catch (e) {
    console.error("Client: Decryption Failed:", e);
  }
}

runClientVerification().catch(console.error);
