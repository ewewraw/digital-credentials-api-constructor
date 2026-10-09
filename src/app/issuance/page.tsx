'use client';

import { useState, useEffect } from 'react';
import type { IssuanceRequestOptions } from '@/lib/types';
import {
  ALL_ISSUANCE_FIELDS,
  ARBITRARY_PROTOCOL_OPTION,
  DEFAULT_INCLUDE_LEGACY_PROTOCOL,
  DEFAULT_ISSUANCE_PROTOCOL,
  isIssuanceProtocol,
} from '@/lib/issuance-options';
import { DEFAULT_CARD_DESIGN, type CardDesignId } from '@/lib/card-designs';
import { generateIssuanceRequestCode, generateIssuanceRequestObject } from '@/lib/issuance-code-generator';
import { getDefaultIssuerUrl, getLoopbackIssuerUrlHint, getStaticHostingProblem } from '@/lib/issuer-url';
import { IssuanceConstructorForm } from '@/components/issuance-constructor-form';
import { CodeDisplay } from '@/components/code-display';
import { TestTubeDiagonal, Pilcrow } from 'lucide-react';
import Link from 'next/link';

const defaultFields = ['given_name', 'family_name'];
const defaultFieldValues: Record<string, string> = {
  given_name: 'Jane',
  family_name: 'Doe',
};

export default function IssuancePage() {
  const [options, setOptions] = useState<IssuanceRequestOptions>({
    protocol: DEFAULT_ISSUANCE_PROTOCOL,
    includeLegacyProtocol: DEFAULT_INCLUDE_LEGACY_PROTOCOL,
    includeArbitraryRequest: false,
    fields: defaultFields,
    fieldValues: defaultFieldValues,
    // Set after mount, because the default can depend on window.location.
    issuerUrl: '',
    cardDesign: DEFAULT_CARD_DESIGN,
  });

  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setOptions(prev => ({ ...prev, issuerUrl: getDefaultIssuerUrl() }));
  }, []);

  useEffect(() => {
    if (isClient) {
      const code = generateIssuanceRequestCode(options);
      setGeneratedCode(code);
    }
  }, [options, isClient]);

  const handleFieldsChange = (fieldId: string, checked: boolean) => {
    setOptions((prev) => {
      const newFields = checked
        ? [...prev.fields, fieldId]
        : prev.fields.filter((id) => id !== fieldId);

      const newFieldValues = { ...prev.fieldValues };
      if (!checked) {
        delete newFieldValues[fieldId];
      } else if (!newFieldValues[fieldId]) {
        newFieldValues[fieldId] = ALL_ISSUANCE_FIELDS.find(f => f.id === fieldId)?.defaultValue ?? '';
      }

      return { ...prev, fields: newFields, fieldValues: newFieldValues };
    });
  };

  const handleFieldValueChange = (fieldId: string, value: string) => {
    if (fieldId === 'issuerUrl') {
      setOptions((prev) => ({ ...prev, issuerUrl: value }));
      return;
    }
    setOptions((prev) => ({
      ...prev,
      fieldValues: {
        ...prev.fieldValues,
        [fieldId]: value,
      },
    }));
  };

  const handleIssuerUrlChange = (value: string) => {
    setOptions((prev) => ({ ...prev, issuerUrl: value }));
  };

  const handleIncludeLegacyProtocolChange = (includeLegacyProtocol: boolean) => {
    setOptions((prev) => ({ ...prev, includeLegacyProtocol }));
  };

  // Handles a selection in the Protocol list. The arbitrary entry keeps the
  // current protocol and adds a request with an arbitrary protocol.
  const handleProtocolOptionChange = (value: string) => {
    setOptions((prev) => ({
      ...prev,
      protocol: isIssuanceProtocol(value) ? value : prev.protocol,
      includeArbitraryRequest: value === ARBITRARY_PROTOCOL_OPTION.value,
    }));
  };

  const handleCardDesignChange = (cardDesign: CardDesignId) => {
    setOptions((prev) => ({ ...prev, cardDesign }));
  };

  const requestObject = generateIssuanceRequestObject(options);
  console.log('[FINAL REQUEST] Credential Offer:', requestObject);
  // Check only on the client, because the issuer URL is set after mount and the
  // static hosting check depends on window.location.
  const issuerUrlProblem = isClient ? getStaticHostingProblem(options.issuerUrl) : null;
  const issuerUrlHint = isClient ? getLoopbackIssuerUrlHint(options.issuerUrl) : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-7xl">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <TestTubeDiagonal className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight font-headline">
              Digital Credential Issuance Constructor
            </h1>
          </div>
          <p className="text-muted-foreground">
            Build and visualize <span className="font-semibold text-foreground">issuance requests</span> for the Digital Credentials API. Need to request a presentation?
            <Link href="/" className="text-primary hover:underline inline-flex items-center gap-1">
               Go to the Presentation Constructor <Pilcrow className="w-4 h-4" />
            </Link>
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <IssuanceConstructorForm
            options={options}
            onProtocolOptionChange={handleProtocolOptionChange}
            onIncludeLegacyProtocolChange={handleIncludeLegacyProtocolChange}
            onCardDesignChange={handleCardDesignChange}
            onFieldsChange={handleFieldsChange}
            onFieldValueChange={handleFieldValueChange}
            availableFields={ALL_ISSUANCE_FIELDS}
            issuerUrlProblem={issuerUrlProblem}
            issuerUrlHint={issuerUrlHint}
          />
          <CodeDisplay
            code={generatedCode}
            requestObject={requestObject}
            options={options}
            className="md:max-h-[calc(100vh-12rem)]"
          />
        </div>
      </div>
    </main>
  );
}
