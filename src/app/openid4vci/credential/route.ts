import { NextResponse } from 'next/server';
import UseThisCbor, { encode, Tagged } from 'cbor';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getCardDesign, type CardDesign } from '@/lib/card-designs';

// Utility to decode Base64Url
function bufferFromBase64Url(base64url: string): Buffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

// Utility to encode Base64Url without padding
// Utility to encode Base64Url without padding
function base64UrlEncode(buffer: Buffer | Uint8Array): string {
  return Buffer.from(buffer).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Utility to create random salt
function createRandomSalt(size: number = 32): Buffer {
  // Use Web Crypto API if available, or Node crypto
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const salt = new Uint8Array(size);
    crypto.getRandomValues(salt);
    return Buffer.from(salt);
  }
  // Fallback for Node.js if global crypto is not Web Crypto (though in Next.js it usually is or we should import)
  return Buffer.alloc(size);
}

// Utility to create IssuerSignedItem
function createIssuerSignedItem(digestId: number, elementId: string, elementValue: any): Buffer {
  const itemMap = new Map();
  itemMap.set('digestID', digestId);
  itemMap.set('random', createRandomSalt());
  itemMap.set('elementIdentifier', elementId);
  itemMap.set('elementValue', elementValue);
  return encode(itemMap); // Returns CBOR bytes of the item
}

/**
 * Returns the card art as a data: URI. CMWallet only reads card art from
 * data: URIs, so the credential response embeds the image.
 */
async function getCardArtUri(design: CardDesign): Promise<string | null> {
  try {
    // publicPath comes from the CARD_DESIGNS allow-list, never from the request.
    const image = await readFile(path.join(process.cwd(), 'public', design.publicPath));
    return `data:image/png;base64,${image.toString('base64')}`;
  } catch (e) {
    // The card art is optional, so issue the credential without it.
    console.error('[Credential Endpoint] Failed to read the card art:', e);
    return null;
  }
}


export async function POST(request: Request) {
  console.log('[Credential Endpoint] Received Request');
  // Log all headers for debugging
  const headers = Object.fromEntries(request.headers.entries());
  console.log('[Credential Endpoint] Headers:', JSON.stringify(headers, null, 2));

  try {
    const body = await request.json();
    console.log('[Credential Endpoint] Received Body:', JSON.stringify(body, null, 2));
    let proofJwt = body.proofs.jwt; // Assuming standard format

    if (Array.isArray(proofJwt)) {
      proofJwt = proofJwt[0];
    }

    // Parse JWT to get the public key
    // Header.Payload.Signature
    const parts = proofJwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const headerBuffer = bufferFromBase64Url(parts[0]);
    const header = JSON.parse(headerBuffer.toString('utf-8'));
    console.log('[Credential Endpoint] Proof Header:', JSON.stringify(header, null, 2));

    const payloadBuffer = bufferFromBase64Url(parts[1]);
    const payload = JSON.parse(payloadBuffer.toString('utf-8'));
    console.log('[Credential Endpoint] Proof Payload:', JSON.stringify(payload, null, 2));

    // Extract cnf.jwk
    // The app puts JWK in the HEADER for openid4vci-proof+jwt
    // But some specs say it should be in payload cnf.
    // We check both.
    const jwk = header.jwk || payload.cnf?.jwk;

    if (!jwk || !jwk.x || !jwk.y) {
      // Fallback for simplicity if not present, but app might fail key check
      console.warn('[Credential Endpoint] Warning: No CNF key found in proof');
    }

    // Construct valid mDoc structure
    // We need:
    // 1. issuerAuth (COSE_Sign1)
    //    - protected headers
    //    - unprotected headers
    //    - payload (DeviceKeyInfo)
    //    - signature

    // 1.1 DeviceKeyInfo Payload (CBOR Map)
    // Keys:
    // "deviceKeyInfo" -> { "deviceKey" -> COSE_Key }
    // COSE_Key for EC P-256:
    // 1 (kty) = 2 (EC)
    // -1 (crv) = 1 (P-256)
    // -2 (x) = Buffer(x)
    // -3 (y) = Buffer(y)

    const xBuffer = jwk ? bufferFromBase64Url(jwk.x) : Buffer.alloc(32);
    const yBuffer = jwk ? bufferFromBase64Url(jwk.y) : Buffer.alloc(32);

    console.log('[Credential Endpoint] Extracted JWK X (Base64Url):', jwk?.x);
    console.log('[Credential Endpoint] Extracted JWK Y (Base64Url):', jwk?.y);
    console.log('[Credential Endpoint] X Buffer (Hex):', xBuffer.toString('hex'));
    console.log('[Credential Endpoint] Y Buffer (Hex):', yBuffer.toString('hex'));

    const deviceKey = new Map();
    deviceKey.set(1, 2); // kty: EC
    deviceKey.set(-1, 1); // crv: P-256
    deviceKey.set(-2, xBuffer);
    deviceKey.set(-3, yBuffer);

    const deviceKeyInfo = new Map();
    deviceKeyInfo.set('deviceKey', deviceKey);
    // Add other fields if necessary, usually 'version': '1.0'

    const payloadMap = new Map();
    payloadMap.set('deviceKeyInfo', deviceKeyInfo);
    payloadMap.set('version', '1.0');
    payloadMap.set('digestAlgorithm', 'SHA-256');
    payloadMap.set('valueDigests', new Map()); // Empty for now
    payloadMap.set('docType', 'org.iso.18013.5.1.mDL');

    const payloadBytes = encode(payloadMap);

    // 1.2 COSE_Sign1
    // [protected, unprotected, payload, signature]
    const protectedHeader = encode(new Map([[1, -7]])); // alg: ES256
    const unprotectedHeader = new Map();
    const signature = Buffer.alloc(64); // Dummy signature

    // The app expects index 2 (payload) to decode into a CborTag (Tag 24).
    // So we wrap the payloadBytes in a Tag 24 structure.
    const taggedPayload = new Tagged(24, payloadBytes);
    const taggedPayloadBytes = encode(taggedPayload);

    const issuerAuth = [
      protectedHeader,
      unprotectedHeader,
      taggedPayloadBytes, // This matches the structure expected by MDoc
      signature
    ];

    // 2. IssuerSigned (CBOR Map)
    const issuerSigned = new Map();
    const nameSpaces = new Map();

    // Extract claims from access_token
    // The card design that the user selected, also from issuer_state.
    let cardDesignId: unknown;
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && (parts[0].toLowerCase() === 'bearer' || parts[0].toLowerCase() === 'dpop')) {
        const accessToken = parts[1];
        try {
          const tokenJson = Buffer.from(accessToken, 'base64').toString('utf-8');
          console.log('[Credential Endpoint] Decoded Access Token:', tokenJson);
          const tokenData = JSON.parse(tokenJson);
          const issuerStateStr = tokenData.is; // Short key 'is' from token/route.ts
          if (issuerStateStr) {
            console.log('[Credential Endpoint] Found issuerState string:', issuerStateStr);
            const issuerState = JSON.parse(issuerStateStr);
            const claims = issuerState.claims || {};
            cardDesignId = issuerState.card_design;
            console.log('[Credential Endpoint] Parsed claims:', JSON.stringify(claims));

            // Construct mDL namespace: org.iso.18013.5.1
            const mdlClaims = new Map();
            let digestIdCounter = 0;

            // Re-loop to build the array correctly
            const signedItems = [];
            for (const [key, value] of Object.entries(claims)) {
              if (!value) continue;
              console.log(`[Credential Endpoint] Adding claim: ${key}=${value}`);
              const itemBytes = createIssuerSignedItem(digestIdCounter++, key, value);
              const taggedItem = new Tagged(24, itemBytes); // This wraps it
              // The library might encode Tagged(24, buf) as D8 18 [buf].
              // MDoc expectation: Array of those.
              signedItems.push(taggedItem);
            }

            if (signedItems.length > 0) {
              nameSpaces.set('org.iso.18013.5.1', signedItems);
            }
          } else {
            console.log('[Credential Endpoint] No issuerState found in token data');
          }
        } catch (e) {
          console.warn('[Credential Endpoint] Failed to parse access_token claims:', e);
        }
      }
    }

    console.log('[Credential Endpoint] Claims (nameSpaces):', JSON.stringify(Object.fromEntries(nameSpaces), null, 2)); 
    issuerSigned.set('issuerAuth', issuerAuth);
    issuerSigned.set('nameSpaces', nameSpaces);

    // Encode structure
    const credentialCbor = encode(issuerSigned);

    // Return as Base64Url
    const credentialString = base64UrlEncode(credentialCbor);

    // The card design that the user selected in the issuance constructor.
    const cardDesign = getCardDesign(cardDesignId);
    const cardArtUri = await getCardArtUri(cardDesign);

    const responseBody = {
    // Contains an array of one or more issued Credentials
      credentials: [
        { credential: credentialString }
      ],
      // Additional Credential Response parameters MAY be defined and used. 
      // The Wallet MUST ignore any unrecognized parameters.
      // `display` isn't one of the defined by openid parameters
      // BUT: the reality of the CM wallet implementation is according to the proposal: 
      // https://github.com/openid/OpenID4VCI/issues/421
      display: [
        {
          name: 'Mock mDL',
          locale: 'en-US',
          description: 'A mock mobile driver license for testing purposes.',
          // CMWallet and Multipaz show the logo as the card art.
          ...(cardArtUri && {
            logo: {
              uri: cardArtUri,
              alt_text: cardDesign.altText,
            },
          }),
        }
      ]
    };

    return NextResponse.json(responseBody);

  } catch (error) {
    console.error('[Credential Endpoint] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
