'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  ARBITRARY_PROTOCOL,
  PROTOCOL_FILTERING_FLAG,
  getProtocolFilteringStatus,
  type ProtocolFilteringStatus,
} from '@/lib/protocol-filtering';

/** The ID that the protocol select references with aria-describedby. */
export const PROTOCOL_FILTERING_NOTE_ID = 'protocol-filtering-note';

// What this browser does with the arbitrary request, for each status.
// remainingRequests names the requests that the browser keeps.
const STATUS_TEXT: Record<
  ProtocolFilteringStatus,
  { label: string; detail: (remainingRequests: string) => ReactNode }
> = {
  on: {
    label: 'On',
    detail: (remainingRequests) => (
      <>
        The browser ignores the <code>{ARBITRARY_PROTOCOL}</code> request and passes only{' '}
        {remainingRequests} to the platform.
      </>
    ),
  },
  off: {
    label: 'Off',
    detail: () => (
      <>
        The browser passes all the requests to the platform. Wallets that don&apos;t support
        the <code>{ARBITRARY_PROTOCOL}</code> protocol skip that request.
      </>
    ),
  },
  unknown: {
    label: 'Unknown',
    detail: () => (
      <>
        This browser doesn&apos;t support{' '}
        <code>DigitalCredential.userAgentAllowsProtocol()</code>.
      </>
    ),
  },
};

interface ProtocolFilteringNoteProps {
  /** The requests that the browser keeps, such as "the OpenID4VP request". */
  remainingRequests: string;
}

/**
 * Explains the "+ arbitrary protocol" options in the presentation and issuance
 * constructors, and shows whether this browser ignores the arbitrary request.
 */
export function ProtocolFilteringNote({ remainingRequests }: ProtocolFilteringNoteProps) {
  // Stays null during server rendering, because only the browser can report
  // whether it filters protocols.
  const [status, setStatus] = useState<ProtocolFilteringStatus | null>(null);

  useEffect(() => {
    setStatus(getProtocolFilteringStatus());
  }, []);

  return (
    <div id={PROTOCOL_FILTERING_NOTE_ID} className="space-y-2 text-sm text-muted-foreground">
      <p>
        Adds a request with <code>{ARBITRARY_PROTOCOL}</code>, a protocol identifier that the
        specification doesn&apos;t define. With protocol filtering, Chrome ignores requests
        with protocols that it doesn&apos;t recognize. To turn on filtering, enable{' '}
        <code className="break-all">{PROTOCOL_FILTERING_FLAG}</code> and restart Chrome. For
        more information, see the{' '}
        <a
          href="https://chromestatus.com/feature/6492906882990080"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          ChromeStatus entry<span className="sr-only"> (opens in a new tab)</span>
        </a>
        .
      </p>
      <p>
        <span className="font-medium text-foreground">
          Protocol filtering in this browser: {status ? `${STATUS_TEXT[status].label}.` : 'Checking…'}
        </span>{' '}
        {status && STATUS_TEXT[status].detail(remainingRequests)}
      </p>
    </div>
  );
}
