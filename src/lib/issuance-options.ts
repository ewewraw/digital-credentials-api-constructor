import { User, Cake, Beer, MapPin, Car, Calendar, ShieldAlert, UserCircle, Globe } from 'lucide-react';
import type { IssuanceFieldOption } from './types';

export const ISSUANCE_PROTOCOLS = [{ value: 'openid4vci', label: 'OpenID4VCI' }];

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
