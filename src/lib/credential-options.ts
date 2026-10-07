import { User, Cake, Beer, MapPin, Car, Calendar, ShieldAlert, UserCircle, Globe } from 'lucide-react';
import type { FieldOption, Protocol, DataFormat } from './types';
import { LucideIcon } from 'lucide-react';

export const protocols: { value: Protocol; label: string }[] = [
  { value: 'openid4vp', label: 'OpenID4VP' },
  { value: 'org-iso-mdoc', label: 'Annex C (ISO 18013-7)' },
];

export const dataFormats: { value: DataFormat; label: string }[] = [
  { value: 'mso_mdoc', label: 'mso_mdoc' },
  { value: 'dc', label: 'dc' },
  { value: 'both', label: 'Both mdoc and DC' },
];

export const ALL_FIELDS: FieldOption[] = [
  {
    id: 'given_name',
    label: 'First Name(s)',
    icon: User,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'given_name'] : ['given_name'],
  },
  {
    id: 'family_name',
    label: 'Last Name',
    icon: User,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'family_name'] : ['family_name'],
  },
  {
    id: 'birth_date',
    label: 'Date of Birth',
    icon: Calendar,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'birth_date'] : ['birthdate'],
  },
  {
    id: 'is_over_18',
    label: 'Is over 18',
    icon: Cake,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'age_over_18'] : ['age_equal_or_over', '18'],
    isAgeCheck: true,
  },
  {
    id: 'is_over_21',
    label: 'Is over 21',
    icon: Beer,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'age_over_21'] : ['age_equal_or_over', '21'],
    isAgeCheck: true,
  },
  {
    id: 'address',
    label: 'Address',
    icon: MapPin,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'resident_address'] : ['address'],
  },
  {
    id: 'document_number',
    label: 'Document Number',
    icon: ShieldAlert,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'document_number'] : ['document_number'],
  },
  {
    id: 'driving_privileges',
    label: 'Driving Privileges',
    icon: Car,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'driving_privileges'] : ['driving_privileges'],
  },
  {
    id: 'expiry_date',
    label: 'Expiry Date',
    icon: Calendar,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'expiry_date'] : ['date_of_expiry'],
  },
  {
    id: 'portrait',
    label: 'Portrait',
    icon: UserCircle,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.18013.5.1', 'portrait'] : ['picture'],
  },
  {
    id: 'age_birth_year',
    label: 'Year of Birth',
    icon: Calendar,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.1e13.5.1', 'age_birth_year'] : ['age_birth_year'],
  },
  {
    id: 'issuing_country',
    label: 'Issuing Country',
    icon: Globe,
    getPath: (format) =>
      format === 'mso_mdoc' ? ['org.iso.23220.1', 'issuing_country'] : ['issuing_country'],
  },
];
