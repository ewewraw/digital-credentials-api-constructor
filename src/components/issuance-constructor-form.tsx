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
import { Input } from '@/components/ui/input';
import type { IssuanceRequestOptions, IssuanceFieldOption } from '@/lib/types';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IssuanceConstructorFormProps {
  options: IssuanceRequestOptions;
  onFieldsChange: (fieldId: string, checked: boolean) => void;
  onFieldValueChange: (fieldId: string, value: string) => void;
  availableFields: IssuanceFieldOption[];
}

export function IssuanceConstructorForm({
  options,
  onFieldsChange,
  onFieldValueChange,
  availableFields,
}: IssuanceConstructorFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Issuance Constructor</CardTitle>
        <CardDescription>
          Select parameters to generate your credential issuance request.
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
                    <p>OpenID for Verifiable Credential Issuance (OpenID4VCI) is a protocol that allows users to obtain verifiable credentials from Issuers and store them in their digital wallets.</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <Select value={options.protocol} disabled>
              <SelectTrigger id="protocol">
                <SelectValue placeholder="Select a protocol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openid4vci1.0">OpenID4VCI</SelectItem>
              </SelectContent>
            </Select>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="issuerUrl">Issuer URL (Origin)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>The origin where this issuer is hosted. Determine what origin the wallet should contact. Use your LAN IP (e.g. http://192.168.1.5:3000) for device testing.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="issuerUrl"
              type="text"
              placeholder="http://localhost:3000"
              value={options.issuerUrl || ''}
              onChange={(e) => onFieldValueChange('issuerUrl', e.target.value)}
            />
          </div>

          </div>

          <div className="space-y-2">
             <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Credential Data</h3>
                 <Tooltip>
                    <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                        <p>Select the claims to include in the credential and provide their values. This data will be embedded in the credential offer.</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Select and fill in the user data to be issued.
            </p>
            <div className="space-y-4 pt-2">
              {availableFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`field-${field.id}`}
                      checked={options.fields.includes(field.id)}
                      onCheckedChange={(checked) => onFieldsChange(field.id, !!checked)}
                    />
                    <Label
                      htmlFor={`field-${field.id}`}
                      className="flex items-center gap-2 font-normal cursor-pointer"
                    >
                      <field.icon className="h-4 w-4 text-muted-foreground" />
                      {field.label}
                    </Label>
                  </div>
                  {options.fields.includes(field.id) && (
                    <div className="pl-7">
                        <Input
                            id={`value-${field.id}`}
                            type="text"
                            placeholder={`Enter ${field.label}`}
                            value={options.fieldValues[field.id] || ''}
                            onChange={(e) => onFieldValueChange(field.id, e.target.value)}
                            className="h-9"
                        />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </TooltipProvider>
    </Card>
  );
}
