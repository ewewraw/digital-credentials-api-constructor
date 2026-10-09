
import { ALL_ISSUANCE_FIELDS, LEGACY_ISSUANCE_PROTOCOL } from './issuance-options';
import { ISSUER_URL_PLACEHOLDER } from './issuer-url';
import { createArbitraryRequest } from './protocol-filtering';
import type { IssuanceRequestOptions } from './types';

export function generateIssuanceRequestObject(options: IssuanceRequestOptions): any {
  const selectedFields = ALL_ISSUANCE_FIELDS.filter((f) => options.fields.includes(f.id));

  // The wallet calls the issuer endpoints directly, so this must be the URL of
  // a server that runs this app's /openid4vci route handlers.
  const issuerOrigin = options.issuerUrl?.trim() || ISSUER_URL_PLACEHOLDER;
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
        // The wallet returns issuer_state to the issuer. This demo issuer is
        // stateless, so issuer_state carries the claim values and card design.
        // TODO(security): A production issuer keeps this state on its server and
        // sends an opaque reference instead, because the wallet can change it.
        issuer_state: JSON.stringify({
          claims: selectedFields.reduce((acc, field) => {
            acc[field.id] = options.fieldValues[field.id] || '';
            return acc;
          }, {} as Record<string, string>),
          card_design: options.cardDesign,
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

  const requests: { protocol: string; data: object }[] = [{ protocol: options.protocol, data: credentialOffer }];
  if (includesLegacyRequest(options)) {
    // The same offer, with the identifier that CMWallet uses in its reply.
    requests.push({ protocol: LEGACY_ISSUANCE_PROTOCOL, data: credentialOffer });
  }
  if (options.includeArbitraryRequest) {
    // Last, so the offer requests keep the same order as without it.
    requests.push(createArbitraryRequest());
  }

  return {
      digital: {
          requests,
      }
  }
}

/** Returns whether the request repeats the offer with the earlier openid4vci identifier. */
export function includesLegacyRequest(options: IssuanceRequestOptions): boolean {
  return options.includeLegacyProtocol && options.protocol !== LEGACY_ISSUANCE_PROTOCOL;
}

export function generateIssuanceRequestCode(options: IssuanceRequestOptions): string {
  const requestObject = generateIssuanceRequestObject(options);
  const objectString = JSON.stringify(requestObject, null, 2);
  const call = `navigator.credentials.create(${objectString});`;
  if (!includesLegacyRequest(options)) {
    return call;
  }
  return [
    call,
  ].join('\n');
}
