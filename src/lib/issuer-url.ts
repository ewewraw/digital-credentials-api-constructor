/**
 * Where the wallet reaches the issuer endpoints during issuance.
 *
 * After `navigator.credentials.create()` hands the credential offer to the
 * wallet, the wallet calls the issuer endpoints (PAR, authorization, token,
 * nonce, and credential) directly. These endpoints are the Next.js route
 * handlers in `src/app/openid4vci/`, so they only exist when this app runs on a
 * server. A static export, such as the GitHub Pages build, can't serve them, so
 * it must point the wallet at a server deployment of this app instead.
 */

/** True when this build is a static export, which has no issuer endpoints. */
export const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

/** An example issuer URL for placeholders and generated code. */
export const ISSUER_URL_PLACEHOLDER = 'https://issuer.example.com';

// Set at build time, for example from the ISSUER_URL GitHub repository variable.
const CONFIGURED_ISSUER_URL = (process.env.NEXT_PUBLIC_ISSUER_URL ?? '').trim();

const SERVER_DEPLOYMENT_HINT = 'Enter the URL of a server deployment of this app.';

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** Returns the issuer URL to prefill. Call it only in the browser. */
export function getDefaultIssuerUrl(): string {
  if (CONFIGURED_ISSUER_URL) {
    return CONFIGURED_ISSUER_URL.replace(/\/+$/, '');
  }
  // A server deployment serves the issuer endpoints from its own origin.
  return IS_STATIC_EXPORT ? '' : window.location.origin;
}

/**
 * Explains why the wallet can't reach the issuer endpoints at `issuerUrl`
 * because this page is a static export. Returns null otherwise.
 */
export function getStaticHostingProblem(issuerUrl?: string): string | null {
  if (!IS_STATIC_EXPORT) {
    return null;
  }
  const value = issuerUrl?.trim();
  if (!value) {
    return `This static build can't run the issuer endpoints that the wallet calls. ${SERVER_DEPLOYMENT_HINT}`;
  }
  const isPageOrigin =
    typeof window !== 'undefined' && parseUrl(value)?.origin === window.location.origin;
  if (isPageOrigin) {
    return `${window.location.origin} is a static site, so it can't run the issuer endpoints that the wallet calls. ${SERVER_DEPLOYMENT_HINT}`;
  }
  return null;
}

/** Explains why the wallet can't use `issuerUrl`, or returns null if it can. */
export function getIssuerUrlProblem(issuerUrl?: string): string | null {
  const staticHostingProblem = getStaticHostingProblem(issuerUrl);
  if (staticHostingProblem) {
    return staticHostingProblem;
  }
  const value = issuerUrl?.trim();
  if (!value) {
    return 'Enter the issuer URL.';
  }
  const url = parseUrl(value);
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    return `Enter a valid issuer URL, such as ${ISSUER_URL_PLACEHOLDER}.`;
  }
  return null;
}

// Hostnames that always refer to the device that makes the request.
function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    /^127(\.\d{1,3}){3}$/.test(hostname)
  );
}

/**
 * Explains how a wallet on a phone can reach a loopback `issuerUrl`, such as
 * http://localhost:9002, which on the phone refers to the phone itself. This
 * is a hint rather than a problem, because `adb reverse` makes such a URL work.
 * Returns null for other URLs.
 */
export function getLoopbackIssuerUrlHint(issuerUrl?: string): string | null {
  const url = parseUrl(issuerUrl?.trim() ?? '');
  if (!url || !isLoopbackHostname(url.hostname)) {
    return null;
  }
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  const lanIpExample = `${url.protocol}//192.168.1.5${url.port ? `:${url.port}` : ''}`;
  return `Check that the mobile device has network access to the issuer URL.`;
}
