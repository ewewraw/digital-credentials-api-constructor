import { User, Cake, Beer, MapPin, Car, Calendar, ShieldAlert, UserCircle, Globe } from 'lucide-react';
import type { IssuanceFieldOption, IssuanceProtocol } from './types';

// The issuance protocols that the request constructor offers. The Digital
// Credentials API specification defines openid4vci-v1 for OpenID4VCI.
export const ISSUANCE_PROTOCOLS: { value: IssuanceProtocol; label: string }[] = [
  { value: 'openid4vci-v1', label: 'OpenID4VCI (openid4vci-v1)' },
];

export const DEFAULT_ISSUANCE_PROTOCOL: IssuanceProtocol = 'openid4vci-v1';

// An earlier OpenID4VCI identifier that Chrome still accepts. CMWallet offers
// itself for openid4vci-v1 requests, but not for openid4vci ones, and it always
// replies with openid4vci. Repeating the offer in a second request with this
// identifier keeps the reply's protocol among the requested ones, so the
// platform can match the reply to a request.
export const LEGACY_ISSUANCE_PROTOCOL: IssuanceProtocol = 'openid4vci';

// On by default for compatibility with CMWallet.
export const DEFAULT_INCLUDE_LEGACY_PROTOCOL = true;

// An extra entry in the Protocol list. It sends the same requests as the
// selected protocol, plus a request with an arbitrary protocol, to demonstrate
// protocol filtering. Selecting it sets includeArbitraryRequest. See
// protocol-filtering.ts.
export const ARBITRARY_PROTOCOL_OPTION = {
  value: 'openid4vci-v1-arbitrary',
  label: 'OpenID4VCI + arbitrary protocol',
};

/** Returns whether `protocol` is an issuance protocol, rather than a presentation one. */
export function isIssuanceProtocol(protocol: string): protocol is IssuanceProtocol {
  return (
    protocol === LEGACY_ISSUANCE_PROTOCOL ||
    ISSUANCE_PROTOCOLS.some((option) => option.value === protocol)
  );
}

export const ALL_ISSUANCE_FIELDS: IssuanceFieldOption[] = [
  {
    id: 'given_name',
    label: 'First Name(s)',
    icon: User,
    defaultValue: 'Jane',
    getPath: () => ['org.iso.18013.5.1', 'given_name'],
    getDisplay: () => ({ name: 'Given Name', locale: 'en-US' }),
  },
  {
    id: 'family_name',
    label: 'Last Name',
    icon: User,
    defaultValue: 'Doe',
    getPath: () => ['org.iso.18013.5.1', 'family_name'],
    getDisplay: () => ({ name: 'Family Name', locale: 'en-US' }),
  },
  {
    id: 'birth_date',
    label: 'Date of Birth',
    icon: Calendar,
    defaultValue: '1990-10-31',
    getPath: () => ['org.iso.18013.5.1', 'birth_date'],
    getDisplay: () => ({ name: 'Date of Birth', locale: 'en-US' }),
  },
  {
    id: 'address',
    label: 'Address',
    icon: MapPin,
    defaultValue: '123 Main St',
    getPath: () => ['org.iso.18013.5.1', 'resident_address'],
    getDisplay: () => ({ name: 'Address', locale: 'en-US' }),
  },
  {
    id: 'document_number',
    label: 'Document Number',
    icon: ShieldAlert,
    defaultValue: '123456789',
    getPath: () => ['org.iso.18013.5.1', 'document_number'],
    getDisplay: () => ({ name: 'Document Number', locale: 'en-US' }),
  },
  {
    id: 'expiry_date',
    label: 'Expiry Date',
    icon: Calendar,
    defaultValue: '2034-10-31',
    getPath: () => ['org.iso.18013.5.1', 'expiry_date'],
    getDisplay: () => ({ name: 'Expiry Date', locale: 'en-US' }),
  },
  {
    id: 'issuing_country',
    label: 'Issuing Country',
    icon: Globe,
    defaultValue: 'US',
    getPath: () => ['org.iso.18013.5.1', 'issuing_country'],
    getDisplay: () => ({ name: 'Issuing Country', locale: 'en-US' }),
  },
];
