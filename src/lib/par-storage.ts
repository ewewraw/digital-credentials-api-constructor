/**
 * Pushed authorization requests (RFC 9126) for the mock issuer.
 *
 * A production authorization server stores each pushed request server-side
 * behind an opaque, single-use `request_uri`. This mock issuer encodes the
 * request into the `request_uri` instead, so the PAR and authorization
 * endpoints don't share state. That keeps the flow working on serverless hosts,
 * where the two requests can reach different instances.
 *
 * TODO(security): The encoded request isn't signed or single-use, so anyone can
 * forge one. That's acceptable only because this mock issuer approves every
 * authorization request anyway.
 */

const REQUEST_URI_PREFIX = 'urn:ietf:params:oauth:request_uri:';

/** How long a pushed authorization request stays valid, in seconds. */
export const PUSHED_REQUEST_LIFETIME_SECONDS = 600;

/** The authorization request parameters that the wallet pushes. */
export interface PushedAuthorizationRequest {
  redirectUri: string;
  state: string | null;
  issuerState: string | null;
  codeChallenge: string | null;
}

/** Returns a `request_uri` that carries `request` until it expires. */
export function createRequestUri(request: PushedAuthorizationRequest): string {
  const payload = {
    ...request,
    exp: Math.floor(Date.now() / 1000) + PUSHED_REQUEST_LIFETIME_SECONDS,
  };
  return REQUEST_URI_PREFIX + Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/** Returns the pushed request in `requestUri`, or null if it's invalid or expired. */
export function resolveRequestUri(requestUri: string): PushedAuthorizationRequest | null {
  if (!requestUri.startsWith(REQUEST_URI_PREFIX)) {
    return null;
  }
  try {
    const encoded = requestUri.slice(REQUEST_URI_PREFIX.length);
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    const isStringOrNull = (value: unknown) => value === null || typeof value === 'string';
    const isValid =
      typeof payload?.redirectUri === 'string' &&
      isStringOrNull(payload.state) &&
      isStringOrNull(payload.issuerState) &&
      isStringOrNull(payload.codeChallenge) &&
      typeof payload.exp === 'number' &&
      payload.exp > Date.now() / 1000;
    if (!isValid) {
      return null;
    }
    const { redirectUri, state, issuerState, codeChallenge } = payload;
    return { redirectUri, state, issuerState, codeChallenge };
  } catch {
    return null;
  }
}
