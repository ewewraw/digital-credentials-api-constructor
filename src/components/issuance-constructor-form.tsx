'use client';

import Image from 'next/image';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { IssuanceRequestOptions, IssuanceFieldOption } from '@/lib/types';
import { ARBITRARY_PROTOCOL_OPTION, ISSUANCE_PROTOCOLS, LEGACY_ISSUANCE_PROTOCOL } from '@/lib/issuance-options';
import { includesLegacyRequest } from '@/lib/issuance-code-generator';
import { CARD_DESIGNS, getCardDesign, type CardDesignId } from '@/lib/card-designs';
import { ISSUER_URL_PLACEHOLDER } from '@/lib/issuer-url';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProtocolFilteringNote, PROTOCOL_FILTERING_NOTE_ID } from '@/components/protocol-filtering-note';

interface IssuanceConstructorFormProps {
  options: IssuanceRequestOptions;
  // Receives the value of the selected entry in the Protocol list.
  onProtocolOptionChange: (value: string) => void;
  onIncludeLegacyProtocolChange: (includeLegacyProtocol: boolean) => void;
  onCardDesignChange: (cardDesign: CardDesignId) => void;
  onFieldsChange: (fieldId: string, checked: boolean) => void;
  onFieldValueChange: (fieldId: string, value: string) => void;
  availableFields: IssuanceFieldOption[];
  // Explains why the wallet can't reach the issuer URL, if it can't.
  issuerUrlProblem?: string | null;
  // Warns about an issuer URL that the wallet might not reach, such as localhost.
  issuerUrlHint?: string | null;
}

export function IssuanceConstructorForm({
  options,
  onProtocolOptionChange,
  onIncludeLegacyProtocolChange,
  onCardDesignChange,
  onFieldsChange,
  onFieldValueChange,
  availableFields,
  issuerUrlProblem,
  issuerUrlHint,
}: IssuanceConstructorFormProps) {
  // A problem blocks issuance, so show it instead of any hint.
  const issuerUrlMessage = issuerUrlProblem || issuerUrlHint;
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
                    <p>OpenID for Verifiable Credential Issuance (OpenID4VCI) is a protocol that allows users to obtain verifiable credentials from Issuers and store them in their digital wallets. The Digital Credentials API identifies it as openid4vci-v1. Chrome also accepts the earlier openid4vci identifier.</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <Select
              value={options.includeArbitraryRequest ? ARBITRARY_PROTOCOL_OPTION.value : options.protocol}
              onValueChange={onProtocolOptionChange}
            >
              <SelectTrigger
                id="protocol"
                aria-describedby={options.includeArbitraryRequest ? PROTOCOL_FILTERING_NOTE_ID : undefined}
              >
                <SelectValue placeholder="Select a protocol" />
              </SelectTrigger>
              <SelectContent>
                {ISSUANCE_PROTOCOLS.map((protocol) => (
                  <SelectItem key={protocol.value} value={protocol.value}>
                    {protocol.label}
                  </SelectItem>
                ))}
                <SelectItem value={ARBITRARY_PROTOCOL_OPTION.value}>
                  {ARBITRARY_PROTOCOL_OPTION.label}
                </SelectItem>
              </SelectContent>
            </Select>
            {options.includeArbitraryRequest && (
              <ProtocolFilteringNote
                remainingRequests={includesLegacyRequest(options) ? 'the OpenID4VCI requests' : 'the OpenID4VCI request'}
              />
            )}
            {/* CMWallet replies with the earlier identifier. See LEGACY_ISSUANCE_PROTOCOL. */}
            <div className="flex items-start space-x-3 pt-1">
              <Checkbox
                id="includeLegacyProtocol"
                checked={options.includeLegacyProtocol}
                onCheckedChange={(checked) => onIncludeLegacyProtocolChange(checked === true)}
                aria-describedby="includeLegacyProtocol-description"
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="includeLegacyProtocol" className="font-normal cursor-pointer">
                  Add an <code>{LEGACY_ISSUANCE_PROTOCOL}</code> request for CMWallet
                </Label>
                <p id="includeLegacyProtocol-description" className="text-sm text-muted-foreground">
                  CMWallet replies with <code>{LEGACY_ISSUANCE_PROTOCOL}</code>, even to
                  an <code>{options.protocol}</code> request. Listing both identifiers keeps
                  its reply among the requested protocols.
                </p>
              </div>
            </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="issuerUrl">Issuer URL (Origin)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>The URL of a server that runs this app&apos;s issuer endpoints. The wallet calls these endpoints directly, so the device that runs the wallet must be able to reach this URL. To test with a local server, use your computer&apos;s LAN IP address, such as http://192.168.1.5:9002.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {issuerUrlMessage && (
              // Shown above the input so that autocomplete suggestions don't cover it.
              <p
                id="issuerUrl-message"
                className={issuerUrlProblem ? 'text-sm text-destructive' : 'text-sm text-amber-700 dark:text-amber-400'}
              >
                {issuerUrlMessage}
              </p>
            )}
            <Input
              id="issuerUrl"
              type="url"
              placeholder={ISSUER_URL_PLACEHOLDER}
              value={options.issuerUrl || ''}
              onChange={(e) => onFieldValueChange('issuerUrl', e.target.value)}
              aria-invalid={issuerUrlProblem ? true : undefined}
              aria-describedby={issuerUrlMessage ? 'issuerUrl-message' : undefined}
            />
          </div>

          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 id="cardDesign-label" className="text-sm font-medium">Card Design</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>The card art that the wallet shows for the issued credential. The issuer reads your choice from issuer_state and returns the image in the credential response.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <RadioGroup
              aria-labelledby="cardDesign-label"
              value={options.cardDesign}
              onValueChange={(value) => onCardDesignChange(getCardDesign(value).id)}
              className="grid-cols-2 gap-4"
            >
              {CARD_DESIGNS.map((design) => (
                // The label wraps the preview, so selecting the image selects the design.
                <Label
                  key={design.id}
                  htmlFor={`cardDesign-${design.id}`}
                  className={cn(
                    'flex cursor-pointer flex-col gap-2 rounded-lg border-2 p-2 font-normal transition-colors',
                    options.cardDesign === design.id ? 'border-primary' : 'border-muted hover:bg-accent',
                  )}
                >
                  {/* The text below names the design, so the preview doesn't need alt text. */}
                  <Image
                    src={design.preview}
                    alt=""
                    sizes="(min-width: 768px) 280px, 50vw"
                    className="h-auto w-full rounded-md"
                  />
                  <span className="flex items-center gap-2">
                    <RadioGroupItem value={design.id} id={`cardDesign-${design.id}`} />
                    {design.label}
                  </span>
                </Label>
              ))}
            </RadioGroup>
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
