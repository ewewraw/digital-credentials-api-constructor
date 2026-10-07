'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from './ui/scroll-area';
import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  claims: Record<string, any> | null;
}

const renderValue = (value: any): JSX.Element | string => {
  if (typeof value === 'object' && value !== null && !(value instanceof Uint8Array)) {
    return (
      <Card className="my-2 bg-muted/50">
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {Object.entries(value).map(([key, subValue]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium capitalize w-1/3 border-r">{key.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="font-mono text-sm">{renderValue(subValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
  return String(value);
};

export function ResultsModal({ isOpen, onClose, claims }: ResultsModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (claims?.portrait && claims.portrait instanceof Uint8Array) {
      const imageBlob = new Blob([claims.portrait], { type: 'image/jpeg' });
      const url = URL.createObjectURL(imageBlob);
      setImageUrl(url);

      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    } else if (claims?.picture && typeof claims.picture === 'string' && claims.picture.startsWith('http')) {
       // Handle picture URL for unencrypted responses
       setImageUrl(claims.picture);
       return () => { setImageUrl(null) };
    }
  }, [claims]);

  if (!claims) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Retrieved Data</DialogTitle>
          <DialogDescription>
            The following claims were successfully retrieved from the credential.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[200px]">Claim</TableHead>
                <TableHead>Value</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(claims).map(([key, value]) => (
                <TableRow key={key}>
                    <TableCell className="font-medium capitalize">{key.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                    {(key === 'portrait' || key === 'picture') && imageUrl ? (
                         <img
                            src={imageUrl}
                            alt="User Portrait"
                            width={100}
                            height={100}
                            className="rounded-md border"
                        />
                    ) : (
                        renderValue(value)
                    )}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
