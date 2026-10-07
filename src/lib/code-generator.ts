
import { ALL_FIELDS } from './credential-options';
import type { RequestOptions, UnsignedRequestData, SignedRequestData } from './types';
import * as jose from 'jose';
import * as cbor from 'cbor';
import { MOCK_MDOC_PRIVATE_JWK, MOCK_MDOC_PUBLIC_JWK, LOCALHOST_KEY_PEM, LOCALHOST_CERT_PEM, CLOUD_KEY_PEM, CLOUD_CERT_PEM } from './mock-keys';

// Encoder for mdoc requests (Strict mode: Canonical CBOR)
// Using 'cbor' package to ensure Definite Length Maps (ISO 18013-5 requirement)
// Returns Buffer which encodes as Major Type 2 (Byte String) without Tag 64.
const mdocCborEncode = (v: any) => cbor.encodeCanonical(v);

// Simple nonce generator
function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function pemToBinary(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function generateOpenId4VpRequest(options: RequestOptions): Promise<{ request: { protocol: string; data: UnsignedRequestData | SignedRequestData }, signingKeys: { privateKey: CryptoKey, publicKeyJwk: jose.JWK } | null }> {
  const selectedFields = ALL_FIELDS.filter((f) => options.fields.includes(f.id));

  const createClaims = (format: 'mso_mdoc' | 'dc+sd-jwt') => {
    return selectedFields.map((field) => {
      const claim: { path: string[]; intent_to_retain?: boolean } = {
        path: field.getPath(format)
      };
      if (format === 'mso_mdoc' && !field.isAgeCheck) {
        claim.intent_to_retain = false;
      }
      return claim;
    });
  }

  const dcql_query: { credentials: any[] } = {
    credentials: []
  };

  if (options.dataFormat === 'mso_mdoc' || options.dataFormat === 'both') {
    const mdocClaims = createClaims('mso_mdoc');
    dcql_query.credentials.push({
      id: 'cred_mdoc',
      format: 'mso_mdoc',
      meta: { doctype_value: 'org.iso.18013.5.1.mDL' },
      claims: mdocClaims.length > 0 ? mdocClaims : undefined,
    });
  }

  if (options.dataFormat === 'dc' || options.dataFormat === 'both') {
    const vcClaims = createClaims('dc+sd-jwt');
    dcql_query.credentials.push({
      id: 'cred_vc',
      format: 'dc+sd-jwt',
      meta: { vct_values: ['urn:eudi:pid:1'] },
      claims: vcClaims.length > 0 ? vcClaims : undefined,
    });
  }
  
  const vpFormatsSupported: any = {};
  if (options.dataFormat === 'mso_mdoc' || options.dataFormat === 'both') {
    vpFormatsSupported['mso_mdoc'] = { 'alg': ['ES256', 'ES384', 'ES512'] };
  }
  if (options.dataFormat === 'dc' || options.dataFormat === 'both') {
    vpFormatsSupported['dc+sd-jwt'] = {
      'sd-jwt_alg_values': ['ES256'],
      'kb-jwt_alg_values': ['ES256'],
    };
  }

  const client_metadata: any = {
      client_name: 'Digital Credential Request Constructor',
      logo_uri: 'https://raw.githubusercontent.com/google/identity-credential/main/docs/logo.svg',
      vp_formats_supported: vpFormatsSupported,
  };

  if (options.encryptResponse) {
    client_metadata.jwks = {
        keys: [
          {
            crv: 'P-256',
            kty: 'EC',
            x: 'DYNAMICALLY_GENERATED',
            y: 'DYNAMICALLY_GENERATED',
            kid: 'response-encryption-key',
            alg: 'ECDH-ES',
            use: 'enc',
          },
        ],
      };
  }

  const unsignedRequestData: UnsignedRequestData = {
    response_type: 'vp_token',
    response_mode: options.encryptResponse ? 'dc_api.jwt' : 'dc_api',
    nonce: generateNonce(),
    client_metadata: client_metadata,
    dcql_query: dcql_query,
  };
  
  if (options.signRequest) {
    const jwsPayload = {
      ...unsignedRequestData,
      client_id: 'x509_san_dns:' + (typeof window !== 'undefined' ? window.location.hostname : 'localhost'),
      expected_origins: ['https://' + (typeof window !== 'undefined' ? window.location.host : 'localhost')],
    };

    const signedData: SignedRequestData = {
        request: "<< JWS SIGNED ON THE FLY >>",
        unsignedRequestData: jwsPayload,
        // The x5c is omitted because we cannot dynamically create a matching certificate on the client.
        // A real implementation would have a backend service generate the key, cert, and signature.
        x5c: [],
    };

    return {
      request: {
        protocol: 'openid4vp-v1-signed',
        data: signedData,
      },
      signingKeys: null
    };
  }

  return {
    request: {
      protocol: 'openid4vp-v1-unsigned',
      data: unsignedRequestData,
    },
    signingKeys: null,
  };
}


async function generateOrgIsoMdocRequest(options: RequestOptions, explicitMdocKeyPair?: CryptoKeyPair): Promise<{ request: any; signingKeys: null; responseDecryptionKey: CryptoKey }> {
    // ---------------------------------------------------------
    // Step 1: Encryption Info
    // ---------------------------------------------------------
  let recipientKeyPair: CryptoKeyPair;
  if (explicitMdocKeyPair) {
    recipientKeyPair = explicitMdocKeyPair;
  } else {
    // USE STATIC MOCK KEY to reduce error surface and ensure key consistency
    // Using MOCK_MDOC_PRIVATE_JWK and MOCK_MDOC_PUBLIC_JWK
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      MOCK_MDOC_PRIVATE_JWK,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      MOCK_MDOC_PUBLIC_JWK,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
    recipientKeyPair = { privateKey, publicKey };
  }
    const recipientPublicKeyJwk = await crypto.subtle.exportKey('jwk', recipientKeyPair.publicKey);
  // STORE PRIVATE KEY for decryption later
  const responseDecryptionKey = recipientKeyPair.privateKey;
  console.log("responseDecryptionKey from code-generator:", responseDecryptionKey)
    
    // Use a Map for the COSE Key to ensure keys are Integers
    const recipientPublicKeyCose = new Map();
  recipientPublicKeyCose.set(1, 2);   // kty: EC2
    recipientPublicKeyCose.set(-1, 1);  // crv: P-256
  recipientPublicKeyCose.set(-2, new Uint8Array(jose.base64url.decode(recipientPublicKeyJwk.x!))); // x
  recipientPublicKeyCose.set(-3, new Uint8Array(jose.base64url.decode(recipientPublicKeyJwk.y!))); // y

  const nonce = crypto.getRandomValues(new Uint8Array(32));
    
    const encryptionInfoRaw = [
      "dcapi", 
        { "nonce": nonce, "recipientPublicKey": recipientPublicKeyCose }
    ];
    
  const encryptionInfoCbor = mdocCborEncode(encryptionInfoRaw);
    const encryptionInfoEncoded = jose.base64url.encode(encryptionInfoCbor);

    // ---------------------------------------------------------
    // Step 2.A: itemsRequest (The Query)
    // ---------------------------------------------------------
    const selectedFields = ALL_FIELDS.filter((f) => options.fields.includes(f.id));
    const mdocClaims = selectedFields.reduce((acc, field) => {
        const claimName = field.getPath('mso_mdoc')[1];
        if (claimName) {
            acc[claimName] = false; 
        }
        return acc;
    }, {} as Record<string, boolean>);

    const itemsRequestRaw = {
        "docType": "org.iso.18013.5.1.mDL",
        "nameSpaces": { "org.iso.18013.5.1": mdocClaims }
    };
    console.log("itemsRequestRaw: ", itemsRequestRaw);

    // 1. Encode the Map to CBOR bytes
  const itemsRequestBytes = mdocCborEncode(itemsRequestRaw);
    console.log("itemsRequestBytes: ", itemsRequestBytes);

    // 2. Wrap these bytes in Tag 24.
  const itemsRequestTagged = new cbor.Tagged(24, itemsRequestBytes);
    console.log("itemsRequestTagged: ", itemsRequestTagged);

    // ---------------------------------------------------------
    // Step 2.B: readerAuth (The Signature)
    // ---------------------------------------------------------
  // ---------------------------------------------------------
  // Step 2.B: readerAuth (The Signature)
  // ---------------------------------------------------------
  let readerAuth: any = undefined;

  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    let keyPem = LOCALHOST_KEY_PEM;
    let certPem = LOCALHOST_CERT_PEM;

    // Elementary environment detection
    if (hostname.includes('cloudworkstations.dev')) {
      keyPem = CLOUD_KEY_PEM;
      certPem = CLOUD_CERT_PEM;
    }

    // 1. Import Signing Key
    const signKeyBinary = pemToBinary(keyPem);
    const signingKey = await crypto.subtle.importKey(
      'pkcs8',
      signKeyBinary as any,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    // 2. Prepare Cert Chain
    const certBinary = pemToBinary(certPem);

    // 3. Construct SessionTranscript
    // SessionTranscript = [DeviceEngagementBytes, ERReaderKeyBytes, Handover]
    // For ISO 18013-7 (Digital Credentials API):
    // DeviceEngagementBytes = null
    // ERReaderKeyBytes = null
    // Handover = [ "dcapi", SHA-256(Encode([Base64Url(Encode(EncryptionInfo)), Origin])) ]

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:9002';

    // dcapiInfo = [ Base64Url(EncryptionInfo), Origin ]
    // encryptionInfoEncoded is already the Base64Url string.
    const dcapiInfo = [encryptionInfoEncoded, origin];
    const dcapiInfoBytes = mdocCborEncode(dcapiInfo);

    const dcapiInfoDigestBuffer = await crypto.subtle.digest('SHA-256', dcapiInfoBytes as any);
    const dcapiInfoDigest = new Uint8Array(dcapiInfoDigestBuffer);

    const handover = ["dcapi", dcapiInfoDigest];

    const sessionTranscript = [
      null,
      null, // ERReaderKeyBytes MUST be null for DC API
      handover
    ];

    // 4. Construct ReaderAuthenticationBytes
    // ReaderAuthentication = [ "ReaderAuthentication", SessionTranscript, ItemsRequestBytes ]
    const readerAuthentication = [
      "ReaderAuthentication",
      sessionTranscript,
      itemsRequestTagged
    ];

    const readerAuthenticationBytes = mdocCborEncode(readerAuthentication);

    // 5. Create COSE_Sign1
    // Protected Header
    // 5. Create COSE_Sign1
    // Protected Header
    // Multipaz Parser REQUIRES 'alg' in Protected Headers.
    const protectedHeaderMap = new Map();
    protectedHeaderMap.set(1, -7); // alg: ES256

    // Unprotected Header
    // Multipaz Parser REQUIRES 'x5chain' in Unprotected Headers (DeviceRequestParser.kt L132).
    const unprotectedHeaderMap = new Map();
    unprotectedHeaderMap.set(33, [certBinary]); // x5chain: [cert] (bstr)

    const protectedHeaderCbor = mdocCborEncode(protectedHeaderMap);

    // Sig_structure
    // external_aad is ReaderAuthBytes = #6.24(bstr .cbor ReaderAuthentication)
    // readerAuthenticationBytes is already (bstr .cbor ReaderAuthentication) [Wait, no. it's just the bytes]

    // readerAuthenticationBytes = Encode(ReaderAuthentication)
    // We need Encode(Tag24(Bstr(readerAuthenticationBytes))) ?
    // Check Multipaz logic: 
    // val readerAuthenticationBytes = Cbor.encode(Tagged(24, Bstr(encodedReaderAuthentication)))
    // And this 'readerAuthenticationBytes' is passed as 'dataToSign' aka external_aad.

    // So:
    // 1. encodedReaderAuthentication = Encode(ReaderAuthenticationStructure) (We have this as readerAuthenticationBytes)
    // 2. readerAuthTagged = Tagged(24, encodedReaderAuthentication)
    // 3. externalAad = Encode(readerAuthTagged)

    const readerAuthTagged = new cbor.Tagged(24, readerAuthenticationBytes);
    const externalAad = mdocCborEncode(readerAuthTagged);

    const sigStructure = [
      "Signature1",
      protectedHeaderCbor,
      externalAad, // external_aad
      new Uint8Array(0) // payload is nil (empty bstr)
    ];

    const sigStructureBytes = mdocCborEncode(sigStructure);

    // Sign
    const signatureBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      signingKey,
      sigStructureBytes as any
    );

    // Assemble COSE_Sign1: [protected, unprotected, payload, signature]
    // Payload is nil
    readerAuth = [
      protectedHeaderCbor,
      unprotectedHeaderMap, // Unprotected header (with x5chain)
      null,                 // Payload (nil)
      new Uint8Array(signatureBuffer)
    ];

    // Wrap in Tag 18 (COSE_Sign1) - optional usually, but good practice.
    // Digital Credentials API might expect untagged array?
    // ISO 18013-5 says readerAuth is a COSE_Sign1.
    // Let's leave it as array (or `new cbor.Tagged(18, readerAuth)` if strict).
    // Usually `readerAuth` field value is the array.
  } catch (e) {
    console.error("Failed to generate readerAuth:", e);
    // Fallback to anonymous if signing fails
  }

    // ---------------------------------------------------------
    // Step 2.C: Assemble deviceRequest
    // ---------------------------------------------------------
  // itemsRequest is ItemsRequestBytes (#6.24(bstr .cbor ItemsRequest)), so we pass the Tagged item directly.
  const docRequest: any = {
    "itemsRequest": itemsRequestTagged,
  };

  if (readerAuth) {
    // Note: While ISO 18013-5 defines 'readerAuth' as 'ReaderAuthBytes' (#6.24(bstr .cbor COSE_Sign1)),
    // the Multipaz/Android implementation expects the raw COSE_Sign1 Array in the map.
    // The strict Tag 24 wrapping confuses the parser.
    docRequest.readerAuth = readerAuth;
  }

    const deviceRequestRaw = {
        "version": "1.0",
      "docRequests": [docRequest]
    };

    console.log("deviceRequestRaw", deviceRequestRaw)

  const deviceRequestCbor = mdocCborEncode(deviceRequestRaw);
    console.log("deviceRequestCbor", deviceRequestCbor)

    const deviceRequestEncoded = jose.base64url.encode(deviceRequestCbor);

    console.log("deviceRequestEncoded:", deviceRequestEncoded)

    // ---------------------------------------------------------
    // Step 3: Final Object
    // ---------------------------------------------------------
    const request = {
        protocol: "org-iso-mdoc",
        data: {
            deviceRequest: deviceRequestEncoded,
            encryptionInfo: encryptionInfoEncoded
        }
    };

  return { request, signingKeys: null, responseDecryptionKey };
}

export async function generateRequestObject(options: RequestOptions, explicitMdocKeyPair?: CryptoKeyPair): Promise<{ requestObject: any; responseDecryptionKey?: CryptoKey }> {
  if (options.protocol === 'openid4vp') {
    const { request } = await generateOpenId4VpRequest(options);
    return {
      requestObject: {
        digital: {
          requests: [request],
        },
        mediation: 'required',
      }
    };
  }

  const { request, responseDecryptionKey } = await generateOrgIsoMdocRequest(options, explicitMdocKeyPair);
  return {
    requestObject: {
      digital: {
        requests: [request],
      },
      mediation: 'required',
    },
    // Pass the key up to the caller
    responseDecryptionKey
  };
}


export function generateRequestCode(options: RequestOptions, requestObject: any): string {
  let objectString = JSON.stringify(requestObject, null, 2);
  
  if (options.signRequest && requestObject.digital?.requests?.[0]?.data?.request) {
    const signedRequestData = requestObject.digital.requests[0].data;
    const placeholder = signedRequestData.request;
    
    // Create a temporary object for stringification that includes the placeholder but not the live signing data
    const tempRequestObject = JSON.parse(JSON.stringify(requestObject));
    const requestData = {
      request: placeholder,
      // We also include the unsigned data here for clarity in the code sample,
      // though it wouldn't be sent in the final JWS.
      unsignedRequestData: signedRequestData.unsignedRequestData,
    };
    if (signedRequestData.x5c && signedRequestData.x5c.length > 0) {
      (requestData as any).x5c = signedRequestData.x5c;
    }
    tempRequestObject.digital.requests[0].data = requestData;

     objectString = JSON.stringify(tempRequestObject, null, 2)
      .replace(`"request": "${placeholder}"`, `"request": "${placeholder}" // This would be the full JWS`);
  } 
  
  if (options.protocol === 'openid4vp' && options.encryptResponse) {
     // The jwks part of the request needs to be dynamically generated at runtime
     // before making the call. Here, we replace the placeholder with a comment.
     objectString = objectString.replace(
      /"x": "DYNAMICALLY_GENERATED",\s*"y": "DYNAMICALLY_GENERATED",/,
      `"x": "...", // These values will be dynamically generated\n        "y": "...",`
    );
  }

  return `navigator.credentials.get(${objectString});`;
}

