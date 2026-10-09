'use client';

import { useState } from 'react';
import * as jose from 'jose';
import * as cbor from 'cbor';
import { CipherSuite, DhkemP256HkdfSha256, HkdfSha256, Aes128Gcm } from '@hpke/core';
import { decodeSdJwt } from '@sd-jwt/decode';
import type { RequestOptions, IssuanceRequestOptions } from '@/lib/types';
import { generateRequestObject } from '@/lib/code-generator';
import { getIssuerUrlProblem } from '@/lib/issuer-url';
import { isIssuanceProtocol, LEGACY_ISSUANCE_PROTOCOL } from '@/lib/issuance-options';
import { MOCK_MDOC_PRIVATE_JWK, MOCK_MDOC_PUBLIC_JWK } from '@/lib/mock-keys';
import { testUserActivationAfterCreate, USER_ACTIVATION_TEST_TOASTS } from '@/lib/user-activation-test';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clipboard, Play, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ResultsModal } from './results-modal';

interface CodeDisplayProps {
  code: string;
  requestObject: any;
  options: RequestOptions | IssuanceRequestOptions;
  responseDecryptionKey?: CryptoKey;
  className?: string;
}

declare global {
  interface DigitalCredential {
    userAgentAllowsProtocol(protocol: string): boolean;
  }
  const DigitalCredential: DigitalCredential | undefined;
}

// Helper function to convert a Base64Url string to a Uint8Array
function base64UrlToUint8Array(base64Url: string) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const paddedBase64 = base64 + padding;
  const rawData = window.atob(paddedBase64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper to ensure we have a standard Uint8Array for Web Crypto
// cbor (node-cbor) returns Buffer, which is a subclass, but explicit conversion is safer for types
function toUint8Array(buf: Uint8Array | Buffer | ArrayBuffer): Uint8Array {
  return new Uint8Array(buf);
}

/**
 * Intelligently decodes a credential from a JWE payload by attempting to parse it
 * as CBOR (for mso_mdoc) and falling back to SD-JWT if that fails.
 * @param {any} decryptedPayload The payload from the decrypted JWE.
 * @returns {Promise<object | null>} A JSON object with the revealed claims.
 */
async function extractClaims(decryptedPayload: any): Promise<object | null> {
  // 1. Extract the raw credential string from the vp_token.
  // This is robust and works for both mso_mdoc and dc+sd-jwt.
  const credentialId = Object.keys(decryptedPayload.vp_token)[0];
  const credentialString = decryptedPayload.vp_token[credentialId][0];

  if (!credentialString) {
    throw new Error("Credential string is missing from the vp_token.");
  }

  // 2. Try to decode as mso_mdoc (CBOR) first.
  try {
    const binaryData = base64UrlToUint8Array(credentialString);
    
    // If this line does not throw an error, it's a valid CBOR object.
    const decodedOuterCbor = cbor.decodeFirstSync(binaryData);

    console.log("Credential appears to be mso_mdoc (CBOR). Parsing...");

    console.log(decodedOuterCbor)

    // --- Start of mso_mdoc specific logic ---
    const mdoc = decodedOuterCbor.documents[0];
    const issuerSignedData = mdoc.issuerSigned.nameSpaces['org.iso.18013.5.1'];
    
    if (!issuerSignedData) {
       throw new Error("Could not find the 'org.iso.18013.5.1' namespace in the credential.");
    }

    const claims: Record<string, any> = {};
    for (const taggedItem of issuerSignedData) {
      // The 'value' is a Uint8Array (or Buffer) of a nested CBOR object.
      // We need to decode it again to get the final data.
      if (taggedItem.tag === 24 && (taggedItem.value instanceof Uint8Array || Buffer.isBuffer(taggedItem.value))) {
        const decodedClaim = cbor.decodeFirstSync(taggedItem.value);
        
        const claimName = decodedClaim.elementIdentifier;
        const claimValue = decodedClaim.elementValue;
        claims[claimName] = claimValue;
      }
    }
    
    console.log("Successfully extracted mdoc claims:", claims);
    return claims;
    // --- End of mso_mdoc specific logic ---

  } catch (cborError) {
    // 3. If the CBOR decoding failed, it's almost certainly an SD-JWT.
    console.log("CBOR decoding failed (as expected for SD-JWT). Parsing as SD-JWT...");
    
    try {
      // --- Start of vp token parsing specific logic ---

      // 1. Define the hasher as a single function that matches the required signature.
      const hasher = async (data: string, alg: string): Promise<Uint8Array> => {
        const dataUint8Array = new TextEncoder().encode(data);
        const digest = await window.crypto.subtle.digest(alg.toUpperCase(), dataUint8Array);
        return new Uint8Array(digest);
      };
      
      // 2. Decode the vp token to get the full parsed object.
      const decodedSdJwt = await decodeSdJwt(credentialString, hasher);

      if (!decodedSdJwt) {
        throw new Error("vp token parsing failed to produce a result.");
      }

      console.log("Successfully parsed the token:", decodedSdJwt);

      // 3. Call the new function to merge the parts into a final claims object.
      const finalClaims = reconstructClaims(decodedSdJwt);
      
      console.log("Reconstructed Final Claims:", finalClaims);
      return finalClaims;
      // --- End of SD-JWT specific logic ---
    } catch (sdJwtError) {
      // If both attempts fail, the format is unknown or corrupt.
      console.error("Failed to parse as mdoc and also failed to parse as SD-JWT.", { cborError, sdJwtError });
      throw new Error("Unknown or corrupt credential format.");
    }
  }
}

async function decryptMdocResponse(responseEncoded: string, recipientPrivateKey: CryptoKey, encryptionInfoRaw: string, requestObject: any): Promise<any> {
    console.log("Starting HPKE Decryption for mdoc response...");

    // 1. Decode Base64Url Response
    const responseBytes = base64UrlToUint8Array(responseEncoded);
  
    // 2. Decode CBOR wrapper: [ "dcapi", { "enc": ..., "cipherText": ... } ]
    const wrapper = cbor.decodeFirstSync(responseBytes);
    if (!Array.isArray(wrapper) || wrapper.length !== 2) {
      throw new Error("Invalid mdoc response wrapper format");
    }
    const [sessionTranscriptId, encryptedData] = wrapper;
    if (sessionTranscriptId !== "dcapi") {
      throw new Error("Unknown session transcript ID: " + sessionTranscriptId);
    }
  
    const { enc, cipherText } = encryptedData;
    if (!enc || !cipherText) {
      throw new Error("Missing encryption data (enc or cipherText)");
    }
    console.log("cipherText length:", cipherText.length);
    console.log("enc length:", enc.length);
  
    // 3. Prepare HPKE Suite
    const suite = new CipherSuite({
      kem: new DhkemP256HkdfSha256(),
      kdf: new HkdfSha256(),
      aead: new Aes128Gcm(),
    });
  
    // 4. Construct SessionTranscript (used as 'info' for HPKE)
    // Structure:
    // encryptionInfo = ["dcapi", { nonce, recipientPublicKey }]  <-- This *should* be what we sent.
    
    // Check if encryptionInfoRaw needs wrapping or if it's already wrapped.
    // In code-generator, we might have sent just the Map.
    // If so, we need to reconstruct what the Wallet Sees.
    
    let encryptionInfoForHash = base64UrlToUint8Array(encryptionInfoRaw);
    try {
        const decoded = cbor.decodeFirstSync(encryptionInfoForHash);
        if (!Array.isArray(decoded) || decoded[0] !== 'dcapi') {
            console.log("Wrapping encryptionInfo in ['dcapi', map] for hash calculation");
            // It was a raw map, so wrap it.
            encryptionInfoForHash = toUint8Array(cbor.encodeCanonical(["dcapi", decoded]));
        } else {
             console.log("EncryptionInfo is already wrapped.");
        }
    } catch (e) {
        console.warn("Could not inspect encryptionInfoRaw", e);
    }
    
    // Origin
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:9002';

    // dcapiInfo = [ Base64Url(EncryptionInfo), Origin ]
    // We use the Base64Url of the *Wrapped* EncryptionInfo
    const base64EncryptionInfo = jose.base64url.encode(encryptionInfoForHash);
    const dcapiInfo = [base64EncryptionInfo, origin];
    const dcapiInfoBytes = cbor.encodeCanonical(dcapiInfo);
    
    const dcapiInfoDigestBuffer = await window.crypto.subtle.digest("SHA-256", dcapiInfoBytes);
    const dcapiInfoDigest = new Uint8Array(dcapiInfoDigestBuffer);
    
    // Handover = ["dcapi", dcapiInfoDigest]
    const handover = ["dcapi", dcapiInfoDigest];
    
    // SessionTranscript = [null, null, Handover]
    const sessionTranscript = [null, null, handover];
    const sessionTranscriptBytes = cbor.encodeCanonical(sessionTranscript);
    
    console.log("HPKE Info (SessionTranscriptBytes):", toUint8Array(sessionTranscriptBytes));
  
    // 5. Decrypt
    try {
      const rkp = await suite.createRecipientContext({
        recipientKey: recipientPrivateKey,
        enc: toUint8Array(enc),
        info: toUint8Array(sessionTranscriptBytes), // Try RAW first (Multipaz Server Logic)
      });
      
      const decrypted = await rkp.open(toUint8Array(cipherText));
      console.log("✅ HPKE Decryption Success!");
      return cbor.decodeFirstSync(new Uint8Array(decrypted));
    } catch (e) {
      console.error("HPKE Decryption failed with RAW info.", e);
      
      // Retry with Tag 24 Wrapped Info (Standard Compliant?)
      try {
          console.log("Retrying with Tag 24 Wrapped Info...");
          // Encode(Tag24(Bstr(EncodedTranscript)))
          // Bstr wrap happens if value is Uint8Array in cbor-node, but we need to ensure right tagging.
          // cbor-node: new Tagged(24, buffer) => Tag 24, Byte String(buffer)
          const tag24 = new cbor.Tagged(24, new Uint8Array(sessionTranscriptBytes));
          const infoTag24 = toUint8Array(cbor.encodeCanonical(tag24));
          
          const rkp2 = await suite.createRecipientContext({
            recipientKey: recipientPrivateKey,
            enc: toUint8Array(enc),
            info: infoTag24,
          });
          const decrypted2 = await rkp2.open(toUint8Array(cipherText));
           console.log("✅ HPKE Decryption Success with Tag 24!");
           return cbor.decodeFirstSync(new Uint8Array(decrypted2));
      } catch (e2) {
          console.error("HPKE Decryption failed with Tag 24 info too.", e2);
          throw new Error("HPKE Decryption failed");
      }
    }
  }

/**
 * Recursively reconstructs the final claims object from a decoded SD-JWT,
 * by merging the main JWT payload with the selectively disclosed claims.
 * This function correctly handles nested objects and arrays.
 * 
 * @param {any} decodedSdJwt The full result object from the decodeSdJwt function.
 * @returns {object} A single JSON object containing all visible and revealed claims.
 */
function reconstructClaims(decodedSdJwt: any): object {
  const { disclosures } = decodedSdJwt;

  // Create a lookup map for fast access to disclosures by their digest (hash).
  const disclosureMap: Record<string, any> = {}
  for (const disclosure of disclosures) {
    // The key for the map is the digest of the disclosure.
    disclosureMap[disclosure.key] = disclosure.value;
  }

  return disclosureMap;
}

/**
 * Extracts claims from a decrypted mdoc DeviceResponse object.
 * @param {any} deviceResponse The decoded CBOR DeviceResponse.
 * @returns {object} The extracted claims.
 */
function extractMdocClaimsFromObject(deviceResponse: any): object {
  const mdoc = deviceResponse.documents[0];
  const issuerSignedData = mdoc.issuerSigned.nameSpaces['org.iso.18013.5.1'];

  if (!issuerSignedData) {
    throw new Error("Could not find the 'org.iso.18013.5.1' namespace in the credential.");
  }

  const claims: Record<string, any> = {};
  for (const taggedItem of issuerSignedData) {
    // The 'value' is a Uint8Array of a nested CBOR object.
    // We need to decode it again to get the final data.
    // We also handle cases where the value might be a Map (if cbor decoder auto-decoded it) or Buffer.
    let valueToDecode = taggedItem.value;
    
    if (taggedItem.tag === 24) {
       // If it's already decoded, great. If it's bytes, decode it.
       if (valueToDecode instanceof Uint8Array || Buffer.isBuffer(valueToDecode)) {
         const decodedClaim = cbor.decodeFirstSync(valueToDecode);
         const claimName = decodedClaim.elementIdentifier;
         const claimValue = decodedClaim.elementValue;
         claims[claimName] = claimValue;
       }
    }
  }
  return claims;
}

export function CodeDisplay({ code, requestObject, options, responseDecryptionKey, className }: CodeDisplayProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const [retrievedClaims, setRetrievedClaims] = useState<Record<string, any> | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast({
      title: 'Copied to clipboard!',
      description: 'The code sample has been copied.',
    });
  };

  const runIssuanceRequest = async (offerObject: any) => {
    console.log("Detected Issuance Request (Credential Offer)");

    // The wallet calls the issuer endpoints directly. If it can't reach them,
    // stop here instead of showing a QR code for an issuance that can't work.
    const issuerUrl = (options as IssuanceRequestOptions).issuerUrl?.trim();
    const issuerUrlProblem = getIssuerUrlProblem(issuerUrl);
    if (issuerUrlProblem) {
      toast({
        variant: 'destructive',
        title: 'Invalid Issuer URL',
        description: issuerUrlProblem,
      });
      return;
    }

    // Wrap it in the Digital Credentials API structure for issuance
    // The structure needs to be strictly: digital: { requests: [{ protocol, data }] }
    // where data IS the offer object from issuance-request.json
    // If the request object is already wrapped in { digital: ... }, use it directly.
    // Otherwise, wrap it assumes it's just the offer payload.
    const issuanceRequest = (offerObject as any).digital
      ? offerObject
      : {
        digital: {
          requests: [{
            protocol: (options as IssuanceRequestOptions).protocol,
            data: offerObject
          }]
        }
      };

    console.log("Sending Issuance Request:", issuanceRequest);
    const { testUserActivation } = options as IssuanceRequestOptions;
    // With the user activation test, the test's result is shown instead.
    if (!testUserActivation) {
      toast({
        title: 'Sending Issuance Request...',
        description: 'Please check your wallet to accept the credential.',
      });
    }

    try {
      // Start create() before awaiting it, so that the user activation test
      // runs right after it, in the same task as the click on Run Request.
      const pendingCredential = (navigator.credentials as any).create(issuanceRequest);
      if (testUserActivation) {
        const result = testUserActivationAfterCreate();
        console.log("User activation test result:", result);
        toast(USER_ACTIVATION_TEST_TOASTS[result]);
      }
      const credential = await pendingCredential;
      // Log only the protocol, because a wallet's reply data can contain
      // credential details.
      console.log("Issuance succeeded. Reply protocol:", credential?.protocol);
      toast({
        title: 'Issuance Success',
        description: `The wallet accepted the offer and replied with the ${credential?.protocol} protocol.`,
      });
    } catch (e: any) {
      console.error("Issuance failed", e);
      // Chrome reports wallet errors, and wallet replies that the platform
      // rejects, as a generic NetworkError ("Error retrieving a token."). This
      // can happen even after the wallet saved the credential.
      let description = e?.message || "Failed to start issuance. Ensure your browser supports it.";
      if (e?.name === 'NetworkError') {
        description = (options as IssuanceRequestOptions).includeLegacyProtocol
          ? `${e.message} If the wallet saved the credential, only its reply to the browser failed. For details, open chrome://device-log. Otherwise, check that the wallet can reach the issuer at ${issuerUrl}.`
          : `${e.message} If the wallet saved the credential, only its reply to the browser failed. CMWallet replies with ${LEGACY_ISSUANCE_PROTOCOL}, so add an ${LEGACY_ISSUANCE_PROTOCOL} request and try again.`;
      }
      toast({
        variant: 'destructive',
        title: 'Issuance Error',
        description,
      });
    }
  };

  const runRequest = async () => {
    console.log("#$#$#$# RUNNING REQUEST METHOD")
    if (typeof DigitalCredential === 'undefined' || !('credentials' in navigator) || !('get' in navigator.credentials) || typeof (navigator.credentials as any).get !== 'function') {
      toast({
        variant: 'destructive',
        title: 'Unsupported Browser',
        description: 'Digital Credentials API is not supported in this browser.',
      });
      return;
    }
    
    // Detect Issuance Request (Credential Offer)
    if (isIssuanceProtocol(options.protocol)) {
      await runIssuanceRequest(requestObject);
      return;
    }

    const requestItem = requestObject?.digital?.requests?.[0];
    if (!requestItem) {
      toast({ variant: 'destructive', title: 'Invalid Request', description: 'Could not find request data (expected digital.requests array).' });
        return;
    }

    if (requestItem.protocol.startsWith('openid4vp-v1-signed')) {
      toast({
        title: 'Simulation Notice',
        description: 'Client-side signing is not performed. In a real app, the JWS would be generated by a secure backend.',
        duration: 5000,
      });
      // In a real app, you would not proceed here without a valid JWS.
      // We stop execution for this demo to avoid sending an invalid request.
      return;
    }
    
    // TODO: the protocol support check
    // if (!DigitalCredential.userAgentAllowsProtocol(requestItem.protocol)) {
    //   toast({
    //     variant: 'destructive',
    //     title: 'Unsupported Protocol',
    //     description: `The protocol "${requestItem.protocol || 'none'}" is not supported in this browser.`,
    //   });
    //   return;
    // }

    try {
      let finalRequestObject = JSON.parse(JSON.stringify(requestObject));
      // Local variable for OIDC4VP key, but we use prop for mdoc
      let localResponseDecryptionKey: CryptoKey | null = null;
      
      const expectsEncryptedResponse = !!requestItem.data?.client_metadata?.jwks;
      
      if (requestItem.protocol.startsWith('openid4vp') && expectsEncryptedResponse) {
        const encryptionKeyPair = await window.crypto.subtle.generateKey(
          { name: "ECDH", namedCurve: "P-256" },
          true,
          ["deriveKey", "deriveBits"]
        );

        const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", encryptionKeyPair.publicKey);

        finalRequestObject = JSON.parse(JSON.stringify(finalRequestObject));

        const targetRequestData = finalRequestObject.digital.requests[0].data.request
            ? finalRequestObject.digital.requests[0].data.request.unsignedRequestData
            : finalRequestObject.digital.requests[0].data;

        targetRequestData.client_metadata.jwks = {
          keys: [
            {
              crv: publicKeyJwk.crv,
              kty: publicKeyJwk.kty,
              x: publicKeyJwk.x,
              y: publicKeyJwk.y,
              kid: "response-encryption-key",
              alg: "ECDH-ES",
              use: "enc"
            }
          ]
        };
        
        localResponseDecryptionKey = encryptionKeyPair.privateKey;
        console.log("Generated ephemeral key pair for response encryption. The private key will be used to decrypt the response.");
      }

      // Use props for org-iso-mdoc (generated in page.tsx) to ensure alignment with QR code.
      if (options.protocol === 'org-iso-mdoc') {
        console.log("Using provided request object and keys from props.");
      }

      toast({
        title: 'Sending Request...',
        description: 'Please check your wallet provider.',
      });
      
      console.log("Sending request with the following object: ", finalRequestObject)
      const credential = await (navigator.credentials as any).get(finalRequestObject);
      
      console.log('Digital Credential Received:', credential);
      let responsePayload;

      // START mdoc specific handling
      if (requestItem.protocol === 'org-iso-mdoc' && credential.data?.response) {
        console.log("Processing org-iso-mdoc response...");
        // Use the prop passed from page.tsx (generated by code-generator.ts)
        // Use local key if generated, otherwise fall back to prop
        const decryptionKeyToUse = localResponseDecryptionKey || responseDecryptionKey;

        if (decryptionKeyToUse) {
          console.log("responseDecryptionKey", responseDecryptionKey);
          try {
            console.log("Decrypting org-iso-mdoc response...");

            const encryptionInfo = finalRequestObject.digital.requests[0]?.data?.encryptionInfo;
            if (!encryptionInfo) {
              throw new Error("Missing encryptionInfo in request object, needed for mdoc decryption.");
            }

            console.log("encryptionInfo", encryptionInfo);

            const decrypted = await decryptMdocResponse(credential.data.response, decryptionKeyToUse, encryptionInfo, finalRequestObject);
            console.log("Decrypted mdoc:", decrypted);

            const claims = extractMdocClaimsFromObject(decrypted);
            setRetrievedClaims(claims);
            setModalOpen(true);
            toast({ title: 'Success', description: 'Mdoc credential decrypted and verified.' });
            return; // DONE - do not fall through to extractClaims

          } catch (e: any) {
            console.error("Mdoc decryption/extraction failed", e);
            toast({ variant: 'destructive', title: 'Decryption/Extraction Error', description: e.message });
            return; // Stop processing
          }
        } else {
          console.error("Missing responseDecryptionKey for mdoc");
          toast({ variant: 'destructive', title: 'Decryption Error', description: 'Missing decryption key for Mdoc response.' });
          return;
        }
      }
      // END mdoc specific handling

      // Handle OpenID4VP decryption (unchanged logic for OIDC4VP)
      if (expectsEncryptedResponse && localResponseDecryptionKey && credential.data?.response) {
        console.log("Response is a JWE. Decrypting...");
        try {
          const { payload } = await jose.jwtDecrypt(credential.data.response, localResponseDecryptionKey);
          console.log("Decrypted JWE Payload:", payload);
          responsePayload = payload;
        } catch (decryptError: any) {
            console.error("Failed to decrypt response:", decryptError);
            toast({
                variant: 'destructive',
                title: 'Decryption Failed',
                description: decryptError.message,
            });
          return;
        }
      } else {
        console.log("Response is not encrypted. Extracting directly...");
        responsePayload = credential.data;
      }
      
      if (!responsePayload) {
        toast({
          variant: 'destructive',
          title: 'Empty Response',
          description: 'No data was received from the wallet.',
        });
        return;
      }

      console.log("Extracting claims from payload:", responsePayload);
      const finalClaims = await extractClaims(responsePayload);

      if (finalClaims) {
        setRetrievedClaims(finalClaims);
        setModalOpen(true);
        toast({
            title: 'Success & Decoded!',
            description: 'Credential response decoded. See retrieved data.',
        });
      } else {
         toast({
          title: 'Success, but...',
          description: 'Response received, but failed to extract claims.',
      });
      }

    } catch (error: any)
      {
      console.error('Digital Credentials API Error:', error);
      toast({
        variant: 'destructive',
        title: 'API Error',
        description: error.message || 'An unknown error occurred.',
      });
    }
  };

  return (
    <>
    <ResultsModal
      isOpen={isModalOpen}
      onClose={() => setModalOpen(false)}
      claims={retrievedClaims}
    />
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Code Sample</CardTitle>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={runRequest}>
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Run Request</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                  {hasCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clipboard className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Copy Code</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0">
          <div key={code} className="p-6 pt-0 animate-in fade-in duration-300">
            <pre className="text-sm bg-muted/50 rounded-md p-4 overflow-x-auto">
              <code className="font-code">{code}</code>
            </pre>
          </div>
      </CardContent>
    </Card>
    </>
  );
}
