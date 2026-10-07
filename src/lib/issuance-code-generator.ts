
import { ALL_ISSUANCE_FIELDS } from './issuance-options';
import type { IssuanceRequestOptions } from './types';

export function generateIssuanceRequestObject(options: IssuanceRequestOptions): any {
  const selectedFields = ALL_ISSUANCE_FIELDS.filter((f) => options.fields.includes(f.id));

  // In a real application, this would be the issuer's actual origin.
  // We use the window location for this demo to make it dynamic.
  const issuerOrigin = options.issuerUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://app.com');
  console.log("issuerOrigin", issuerOrigin)

  const baseUrl = issuerOrigin.replace(/\/$/, '');

  const credentialOffer = {
    credential_issuer: baseUrl,
    credential_configuration_ids: ['org.iso.18013.5.1.mDL'],
    authorization_server_metadata: {
      issuer: baseUrl,
      token_endpoint: `${baseUrl}/openid4vci/token`,
      authorization_endpoint: `${baseUrl}/openid4vci/auth`,
      grant_types_supported: ['authorization_code', 'urn:ietf:params:oauth:grant-type:pre-authorized_code'],
      response_types_supported: ['code', 'token'],
      pushed_authorization_request_endpoint: `${baseUrl}/openid4vci/par`,
    },
    grants: {
      'authorization_code': {
        issuer_state: JSON.stringify({
          claims: selectedFields.reduce((acc, field) => {
            acc[field.id] = options.fieldValues[field.id] || '';
            return acc;
          }, {} as Record<string, string>)
        })
      }
    },
    credential_issuer_metadata: {
      credential_issuer: baseUrl,
      credential_endpoint: `${baseUrl}/openid4vci/credential`,
      nonce_endpoint: `${baseUrl}/openid4vci/nonce`,
      credential_configurations_supported: {
        'org.iso.18013.5.1.mDL': {
          format: 'mso_mdoc',
          doctype: 'org.iso.18013.5.1.mDL',
          // credential_metadata: {
          //   display: [
          //     {
          //       name: 'Driving License',
          //       locale: 'en-US',
          //       description: 'Mobile Driving License',
          //       background_image: {
          //         uri: 'https://digital-credentials.dev/static/aus-mdl-cardart.png'
          //       },
          //       logo: {
          //         uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Emoji_u1fkr.svg/1200px-Emoji_u1fkr.svg.png',
          //         alt_text: 'mDL Logo'
          //       }
          //     }
          //   ]
          // },
          claims: selectedFields.map((field) => {
            const display = field.getDisplay();
            return {
              path: ['org.iso.18013.5.1', field.id],
              display: display ? [display] : []
            };
          }),
        },
      },
    },
     // This part is not standard in OpenID4VCI but is used here to pass claim values
     // to the `navigator.credentials.create` call for demonstration purposes.
     // In a real flow, this data would come from the issuer's backend.
    claims: {
        'org.iso.18013.5.1': selectedFields.reduce((acc, field) => {
            acc[field.id] = options.fieldValues[field.id] || '';
            return acc;
        }, {} as Record<string, any>),
    }
  };
  
  return {
      digital: {
          requests: [{
            protocol: 'openid4vci1.0',
              data: credentialOffer,
          }]
      }
  }
}

export function generateIssuanceRequestCode(options: IssuanceRequestOptions): string {
  const requestObject = generateIssuanceRequestObject(options);
  const objectString = JSON.stringify(requestObject, null, 2);
  return `navigator.credentials.create(${objectString});`;
}
