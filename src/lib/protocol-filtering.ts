// Chrome's upcoming protocol filtering in the Digital Credentials API. With
// filtering, navigator.credentials.create() ignore requests whose
// protocol identifier Chrome doesn't recognize, and reject with a TypeError if
// no request remains. To try it in Chrome 155 and later, enable the flag below
// and restart Chrome. For a standalone demo, see
// no-arbitrary-protocols-dc-demo.html.

/** The chrome://flags entry that turns on protocol filtering. */
export const PROTOCOL_FILTERING_FLAG = 'chrome://flags/#enable-experimental-web-platform-features';

/** A well-formed protocol identifier that the specification doesn't define. */
export const ARBITRARY_PROTOCOL = 'arbitrary';

/**
 * Returns a request with the arbitrary protocol. With protocol filtering,
 * Chrome ignores it. Without filtering, Chrome passes it to the platform, and
 * wallets skip it because they don't support the protocol.
 */
export function createArbitraryRequest() {
  return {
    protocol: ARBITRARY_PROTOCOL,
    // Keep data a JSON object. Some wallets, such as CMWallet, parse the data
    // of every request, including requests with protocols they don't support.
    data: { note: 'The specification does not define this protocol.' },
  };
}

export type ProtocolFilteringStatus = 'on' | 'off' | 'unknown';

/**
 * Returns whether this browser filters out unrecognized protocols. With
 * filtering, DigitalCredential.userAgentAllowsProtocol() returns false for
 * identifiers that the browser doesn't recognize. Without filtering, Chrome
 * returns true for any well-formed identifier. Call it only in the browser.
 */
export function getProtocolFilteringStatus(): ProtocolFilteringStatus {
  const digitalCredential = (globalThis as {
    DigitalCredential?: { userAgentAllowsProtocol?: (protocol: string) => boolean };
  }).DigitalCredential;
  if (typeof digitalCredential?.userAgentAllowsProtocol !== 'function') {
    return 'unknown';
  }
  try {
    return digitalCredential.userAgentAllowsProtocol(ARBITRARY_PROTOCOL) ? 'off' : 'on';
  } catch {
    return 'unknown';
  }
}
