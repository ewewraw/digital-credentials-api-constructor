
import cbor from 'cbor';
import * as jose from 'jose';
import * as crypto from 'crypto';

// Polyfill web crypto if needed (Node 18+ has it global usually)
// const subtle = crypto.webcrypto.subtle; 

const MOCK_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIBYjCCAQegAwIBAgIUQXEkqMGeLh7kQIwpXdWL9oI0VNswCgYIKoZIzj0EAwIw
FDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTI2MDIwNjE2Mzc0NVoXDTI3MDIwNjE2
Mzc0NVowFDESMBAGA1UEAwwJbG9jYWxob3N0MFkwEwYHKoZIzj0CAQYIKoZIzj0D
AQcDQgAEiFmH5tWjGlEqNrs03WdJBLSCiNJmk0AQPs2Tu73zYiH6PujCfiOpXUzl
EpUj9wZOoKDhcWYJAQcRnuDjDDQQ3qM3MDUwFAYDVR0RBA0wC4IJbG9jYWxob3N0
MB0GA1UdDgQWBBT2X4CM512KeECF28aZz/hVC4/MEDAKBggqhkjOPQQDAgNJADBG
AiEAgMtFXN6luvvKbVWiyb+SurVF2gNaG5E4eRll40VXi74CIQCGd49y+hOzaOP+
xD8W2v6+5d/w3wVlL/fzXw2T6sd+Yw==
-----END CERTIFICATE-----`;

const MOCK_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg8BEZhT9J3H2i5bMg
Uk0DIzLiD2f1M1ilrIdYoBJEIQqhRANCAASIWYfm1aMaUSo2uzTdZ0kEtIKI0maT
QBA+zZO7vfNiIfo+6MJ+I6ldTOUSlSP3Bk6goOFxZgkBBxGe4OMMNBDe
-----END PRIVATE KEY-----`;

function pemToBinary(pem: string): Uint8Array {
    const base64 = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s/g, '');
    return new Uint8Array(Buffer.from(base64, 'base64'));
}

async function main() {
    // 1. Keys
    const keyBin = pemToBinary(MOCK_KEY_PEM);
    const certBin = pemToBinary(MOCK_CERT_PEM);
    
    // Import Key
    const signingKey = await crypto.webcrypto.subtle.importKey(
        'pkcs8',
        keyBin,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    // 2. Mock Data
    const sessionTranscript = [null, null, ["dcapi", new Uint8Array(32).fill(1)]];
    const itemsRequestBytes = cbor.encodeCanonical({ docType: "org.iso.18013.5.1.mDL", nameSpaces: {} });
    const itemsRequestTagged = new cbor.Tagged(24, itemsRequestBytes);
    
    const readerAuthentication = [
        "ReaderAuthentication",
        sessionTranscript,
        itemsRequestTagged
    ];
    
    const readerAuthenticationBytes = cbor.encodeCanonical(readerAuthentication);
    
    // 3. COSE Headers
    const protectedMap = new Map();
    protectedMap.set(1, -7); // ES256
    const protectedBytes = cbor.encodeCanonical(protectedMap);
    
    const unprotectedMap = new Map();
    unprotectedMap.set(33, [certBin]);
    
    // 4. Sig Structure
    const readerAuthTagged = new cbor.Tagged(24, readerAuthenticationBytes);
    const externalAad = cbor.encodeCanonical(readerAuthTagged);
    
    const sigStructure = [
        "Signature1",
        protectedBytes,
        externalAad,
        new Uint8Array(0)
    ];
    
    const sigStructureBytes = cbor.encodeCanonical(sigStructure);
    
    // 5. Sign
    const sig = await crypto.webcrypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        signingKey,
        sigStructureBytes
    );
    
    console.log("Signature length:", sig.byteLength); // Should be 64
    
    // 6. Verify (Manual) using node crypto
    const verify = crypto.createVerify('SHA256');
    verify.update(sigStructureBytes);
    const valid = verify.verify({
        key: MOCK_CERT_PEM, // Use Cert directly
        format: 'pem'
    }, Buffer.from(sig));
    
    console.log("Verification Result:", valid);
    
    console.log("x5chain Cert Size:", certBin.length);

    // Check COSE Strictness
    console.log("Protected Header:", Metadata(protectedBytes));
    console.log("Unprotected Header:", Metadata(cbor.encode(unprotectedMap)));
    
    // Simulate Parsing
    const readerAuth = [
        protectedBytes,
        unprotectedMap,
        null,
        new Uint8Array(sig)
    ];
    
    // Check if x5chain is accessible
    const unprot = readerAuth[1] as Map<any, any>;
    const x5chain = unprot.get(33);
    console.log("x5chain found:", !!x5chain);
    console.log("x5chain length:", x5chain?.length);
    if (x5chain && Array.isArray(x5chain)) {
        console.log("x5chain[0] length:", x5chain[0].length);
    }
}

function Metadata(buf: any) {
    return Buffer.from(buf).toString('hex');
}

main().catch(console.error);
