import type { LucideIcon } from 'lucide-react';
import type { CardDesignId } from './card-designs';

// The protocol options in the presentation constructor. 'openid4vp-arbitrary'
// sends the OpenID4VP request and a request with an arbitrary protocol, to
// demonstrate protocol filtering. See protocol-filtering.ts.
export type Protocol = 'openid4vp' | 'org-iso-mdoc' | 'openid4vp-arbitrary';
export type DataFormat = 'mso_mdoc' | 'dc' | 'both';

export interface RequestOptions {
  protocol: Protocol;
  dataFormat: DataFormat;
  fields: string[];
  signRequest: boolean;
  encryptResponse: boolean;
}

export interface FieldOption {
  id: string;
  label: string;
  icon: LucideIcon;
  getPath: (format: 'mso_mdoc' | 'dc+sd-jwt') => string[];
  isAgeCheck?: boolean;
}

export type UnsignedRequestData = {
    response_type: 'vp_token';
    response_mode: 'dc_api' | 'dc_api.jwt';
    nonce: string;
    client_metadata: any;
    dcql_query: any;
  issuerUrl?: string; // Added issuerUrl
};

// For signed requests, the 'request' parameter contains the data needed to build the JWS
export type SignedRequestData = {
    request: string; // This will hold the placeholder string "<< JWS SIGNED ON THE FLY >>"
    unsignedRequestData: UnsignedRequestData & { client_id: string; expected_origins: string[] };
    x5c: string[];
};

// Types for Issuance
// The issuance protocol identifiers that Chrome recognizes.
export type IssuanceProtocol = 'openid4vci-v1' | 'openid4vci';

export interface IssuanceRequestOptions {
  protocol: IssuanceProtocol;
  // Whether to repeat the offer in a second request that uses the earlier
  // openid4vci identifier. See LEGACY_ISSUANCE_PROTOCOL.
  includeLegacyProtocol: boolean;
  // Whether to add a request with an arbitrary protocol, to demonstrate
  // protocol filtering. See ARBITRARY_PROTOCOL_OPTION.
  includeArbitraryRequest: boolean;
  // Whether Run Request also calls window.open() right after create(), to test
  // whether create() consumes the user activation. See user-activation-test.ts.
  testUserActivation: boolean;
  fields: string[];
  fieldValues: Record<string, string>;
  issuerUrl?: string;
  // The card art that the wallet shows for the issued credential.
  cardDesign: CardDesignId;
}

export interface IssuanceFieldOption {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultValue?: string;
  getPath: () => string[];
  getDisplay: () => { name: string; locale: string };
}
