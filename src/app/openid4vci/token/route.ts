import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('[Token Endpoint] Received Request');
  const body = await request.formData().catch((e) => {
    console.error('[Token Endpoint] Error parsing form data:', e);
    return null;
  });
  console.log('[Token Endpoint] Body:', body);
  // CMWallet might send URL-encoded form data.
  // If not body, check json.

  // Return valid token response
  // Extract issuer_state from code if present (and if grant_type is authorization_code)
  let issuerState = null;
  const grantType = body?.get('grant_type') || (body as any)?.grant_type;
  const code = body?.get('code') || (body as any)?.code;

  if (grantType === 'authorization_code' && code) {
    try {
      console.log('[Token Endpoint] Decoding code:', code);
      // Decode code (base64url)
      const codeJson = Buffer.from(code, 'base64').toString('utf-8');
      console.log('[Token Endpoint] Decoded code JSON:', codeJson);
      const codeData = JSON.parse(codeJson);
      issuerState = codeData.issuerState;
      console.log('[Token Endpoint] Extracted issuerState:', issuerState);
    } catch (e) {
      console.warn('[Token Endpoint] Failed to decode code:', e);
    }
  }

  // Embed issuerState in access_token so credential endpoint can recover it
  const tokenData = {
    uuid: crypto.randomUUID(),
    is: issuerState // Short key to save space
  };
  console.log('[Token Endpoint] Encoding access token data:', JSON.stringify(tokenData));
  const accessToken = Buffer.from(JSON.stringify(tokenData)).toString('base64');

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 86400,
    authorization_details: [
      {
        type: 'openid_credential',
        credential_configuration_id: 'org.iso.18013.5.1.mDL',
        credential_identifiers: [
          'mock-credential-id-1'
        ]
      }
    ]
  });
}
