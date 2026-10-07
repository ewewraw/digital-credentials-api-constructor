'use client';

import { useState, useEffect } from 'react';
import type { RequestOptions, DataFormat } from '@/lib/types';
import { ALL_FIELDS } from '@/lib/credential-options';
import { generateRequestCode, generateRequestObject } from '@/lib/code-generator';
import { ConstructorForm } from '@/components/constructor-form';
import { CodeDisplay } from '@/components/code-display';
import { Pilcrow, TestTubeDiagonal } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [options, setOptions] = useState<RequestOptions>({
    protocol: 'openid4vp',
    dataFormat: 'mso_mdoc',
    fields: ['given_name', 'family_name', 'is_over_18'],
    signRequest: false,
    encryptResponse: true,
  });

  const [generated, setGenerated] = useState<{ code: string; object: any; responseDecryptionKey?: CryptoKey }>({
    code: '',
    object: null,
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const generate = async () => {
      if (isClient) {
        const { requestObject, responseDecryptionKey } = await generateRequestObject(options);
        const code = generateRequestCode(options, requestObject);
        setGenerated({ code, object: requestObject, responseDecryptionKey });
      }
    };
    generate();
  }, [options, isClient]);

  const handleOptionsChange = (newOptions: Partial<RequestOptions>) => {
    // When changing data format, we might need to update fields if they are not compatible
    if (newOptions.dataFormat) {
      setOptions((prev) => {
        const currentFields = ALL_FIELDS.filter(f => prev.fields.includes(f.id));
        const newFields = currentFields.map(f => f.id);
        
        // Example logic: if switching away from mso_mdoc, remove mdoc only fields
        if (prev.dataFormat === 'mso_mdoc' && newOptions.dataFormat !== 'mso_mdoc') {
          // You could add logic here to filter fields if needed
        }
        
        return { ...prev, ...newOptions, fields: newFields };
      });
    } else {
      setOptions((prev) => ({ ...prev, ...newOptions }));
    }
  };

  const handleFieldsChange = (fieldId: string, checked: boolean) => {
    setOptions((prev) => {
      const newFields = checked
        ? [...prev.fields, fieldId]
        : prev.fields.filter((id) => id !== fieldId);
      return { ...prev, fields: newFields };
    });
  };

  const handleSecurityChange = (option: 'signRequest' | 'encryptResponse', checked: boolean) => {
    setOptions((prev) => ({ ...prev, [option]: checked }));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-7xl">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <Pilcrow className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight font-headline">
              Digital Credential Request Constructor
            </h1>
          </div>
           <p className="text-muted-foreground">
            Build and visualize <span className="font-semibold text-foreground">presentation requests</span> for the Digital Credentials API. Need to issue a credential? 
            <Link href="/issuance" className="text-primary hover:underline inline-flex items-center gap-1">
              Go to the Issuance Constructor <TestTubeDiagonal className="w-4 h-4" />
            </Link>
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <ConstructorForm
            options={options}
            onOptionsChange={handleOptionsChange}
            onFieldsChange={handleFieldsChange}
            onSecurityChange={handleSecurityChange}
            availableFields={ALL_FIELDS}
          />
          <CodeDisplay
            code={generated.code}
            requestObject={generated.object}
            options={options}
            responseDecryptionKey={generated.responseDecryptionKey}
            className="md:max-h-[calc(100vh-12rem)]"
          />
        </div>
      </div>
    </main>
  );
}
