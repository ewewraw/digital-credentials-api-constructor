'use client';

import { useState, useEffect } from 'react';
import type { IssuanceRequestOptions } from '@/lib/types';
import { ALL_ISSUANCE_FIELDS } from '@/lib/issuance-options';
import { generateIssuanceRequestCode, generateIssuanceRequestObject } from '@/lib/issuance-code-generator';
import { IssuanceConstructorForm } from '@/components/issuance-constructor-form';
import { CodeDisplay } from '@/components/code-display';
import { TestTubeDiagonal, Pilcrow } from 'lucide-react';
import Link from 'next/link';

const defaultFields = ['given_name', 'family_name'];
const defaultFieldValues: Record<string, string> = {
  given_name: 'Jane',
  family_name: 'Doe',
};

const defaultIssuerUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

export default function IssuancePage() {
  const [options, setOptions] = useState<IssuanceRequestOptions>({
    protocol: 'openid4vci1.0',
    fields: defaultFields,
    fieldValues: defaultFieldValues,
    issuerUrl: defaultIssuerUrl,
  });

  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setOptions(prev => ({ ...prev, issuerUrl: window.location.origin }));
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

  const requestObject = generateIssuanceRequestObject(options);
  console.log('[FINAL REQUEST] Credential Offer:', requestObject);

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
            onFieldsChange={handleFieldsChange}
            onFieldValueChange={handleFieldValueChange}
            availableFields={ALL_ISSUANCE_FIELDS}
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
