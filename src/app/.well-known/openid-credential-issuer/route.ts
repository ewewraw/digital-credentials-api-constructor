import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { headers } = request;
  const host = headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const issuerOrigin = `${protocol}://${host}`;

  const metadata = {
    credential_issuer: issuerOrigin,
    authorization_server_metadata: {
      issuer: issuerOrigin,
      token_endpoint: `${issuerOrigin}/openid4vci/token`,
      authorization_endpoint: `${issuerOrigin}/openid4vci/auth`,
      grant_types_supported: [
        'authorization_code',
        'urn:ietf:params:oauth:grant-type:pre-authorized_code',
      ],
      response_types_supported: ['code', 'token'],
      pushed_authorization_request_endpoint: `${issuerOrigin}/openid4vci/par`,
    },
    credential_endpoint: `${issuerOrigin}/openid4vci/credential`,
    credential_configurations_supported: {
      'org.iso.18013.5.1.mDL': {
        format: 'mso_mdoc',
        doctype: 'org.iso.18013.5.1.mDL',
        cryptographic_binding_methods_supported: ['cose_key'],
        credential_signing_alg_values_supported: ['ES256'],
        credential_metadata: {
          display: [
            {
              name: 'Driving License',
              locale: 'en-US',
              description: 'Mobile Driving License',
              background_image: {
                uri: 'https://digital-credentials.dev/static/aus-mdl-cardart.png',
              },
            },
          ],
        },
        // Claims would dynamically cover all supported claims, but for discovery
        // we can list the common ones or leave minimal if the wallet supports it.
        // Copying a subset to be safe and brief.
        claims: {
           "org.iso.18013.5.1": {
              "family_name": { "display": [{ "name": "Family Name", "locale": "en-US" }] },
              "given_name": { "display": [{ "name": "Given Name", "locale": "en-US" }] },
              "birth_date": { "display": [{ "name": "Birth Date", "locale": "en-US" }] }
           }
        }
      },
    },
  };

  return NextResponse.json(metadata);
}
