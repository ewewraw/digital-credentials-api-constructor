import type { LucideIcon } from 'lucide-react';

export type Protocol = 'openid4vp' | 'org-iso-mdoc';
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
export type IssuanceProtocol = 'openid4vci1.0';

export interface IssuanceRequestOptions {
  protocol: IssuanceProtocol;
  fields: string[];
  fieldValues: Record<string, string>;
  issuerUrl?: string;
}

export interface IssuanceFieldOption {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultValue?: string;
  getPath: () => string[];
  getDisplay: () => { name: string; locale: string };
}
