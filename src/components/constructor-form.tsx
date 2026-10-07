'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { RequestOptions, Protocol, DataFormat, FieldOption } from '@/lib/types';
import { protocols, dataFormats } from '@/lib/credential-options';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConstructorFormProps {
  options: RequestOptions;
  onOptionsChange: (newOptions: Partial<RequestOptions>) => void;
  onFieldsChange: (fieldId: string, checked: boolean) => void;
  onSecurityChange: (option: 'signRequest' | 'encryptResponse', checked: boolean) => void;
  availableFields: FieldOption[];
}

export function ConstructorForm({
  options,
  onOptionsChange,
  onFieldsChange,
  onSecurityChange,
  availableFields,
}: ConstructorFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Constructor</CardTitle>
        <CardDescription>
          Select parameters to generate your credential request.
        </CardDescription>
      </CardHeader>
      <TooltipProvider>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="protocol">Protocol</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Different wallets and different browsers may support different protocols. For more details, refer to the browser or wallet documentation. For example, in v141, Chrome is protocol-agnostic.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={options.protocol}
              onValueChange={(value: Protocol) => onOptionsChange({ protocol: value })}
            >
              <SelectTrigger id="protocol">
                <SelectValue placeholder="Select a protocol" />
              </SelectTrigger>
              <SelectContent>
                {protocols.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="data-format">Data Format</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Different digital identity documents may have different formats. For example, mdoc is often used for a digital driving licence. European digital identity documents might use the DC format.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={options.dataFormat}
              onValueChange={(value: DataFormat) =>
                onOptionsChange({ dataFormat: value })
              }
            >
              <SelectTrigger id="data-format">
                <SelectValue placeholder="Select a data format" />
              </SelectTrigger>
              <SelectContent>
                {dataFormats.map((df) => (
                  <SelectItem key={df.value} value={df.value}>
                    {df.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Requested Data Fields</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Different digital documents may contain different information. If none of the documents stored on the user's device contain all the fields you're requesting, the request will fail.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Select the user data you want to verify.
            </p>
            <div className="space-y-3 pt-2">
              {availableFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={field.id}
                    checked={options.fields.includes(field.id)}
                    onCheckedChange={(checked) => onFieldsChange(field.id, !!checked)}
                  />
                  <Label
                    htmlFor={field.id}
                    className="flex items-center gap-2 font-normal cursor-pointer"
                  >
                    <field.icon className="h-4 w-4 text-muted-foreground" />
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {options.protocol === 'openid4vp' && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Security Options</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                     <p>You can add layers of security to the data exchange. Sign the request with your private key to prove its authenticity and integrity, allowing the wallet to confirm it hasn't been tampered with. Encrypt the response to ensure that only your server can decrypt the information.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                 <p className="text-sm text-muted-foreground">
                  Configure request signing and response encryption.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="signRequest"
                      checked={options.signRequest}
                      onCheckedChange={(checked) => onSecurityChange('signRequest', !!checked)}
                    />
                    <Label htmlFor="signRequest" className="font-normal cursor-pointer">
                      Sign Request
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="encryptResponse"
                      checked={options.encryptResponse}
                      onCheckedChange={(checked) => onSecurityChange('encryptResponse', !!checked)}
                    />
                    <Label htmlFor="encryptResponse" className="font-normal cursor-pointer">
                      Encrypt Response
                    </Label>
                  </div>
                </div>
              </div>
            </>
          )}

        </CardContent>
      </TooltipProvider>
    </Card>
  );
}
