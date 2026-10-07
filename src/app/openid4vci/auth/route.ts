import { NextResponse } from 'next/server';
import { parStorage } from '@/lib/par-storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');

  const requestUri = searchParams.get('request_uri');

  if (requestUri) {
    // If request_uri is present, we must use the stored parameters
    const stored = parStorage.get(requestUri);
    if (stored) {
      const { redirectUri: storedRedirectUri, state: storedState, issuerState: storedIssuerState } = JSON.parse(stored);
      // Override params with stored ones
      if (storedRedirectUri) {
        // This is a hack for the mock: we can't easily mutate const redirectUri effectively in this scope without let
        return handleRedirect(storedRedirectUri, storedState || state, storedIssuerState);
      }
    }
    // If we can't find it, we might fall back or error.
    console.warn(`[Auth Endpoint] specific request_uri not found in storage: ${requestUri}`);
  }

  if (!redirectUri) {
    return new NextResponse('Missing redirect_uri', { status: 400 });
  }

  return handleRedirect(redirectUri, state, undefined);
}

function handleRedirect(redirectUri: string, state: string | null, issuerState?: string) {
  // Mock auto-approval
  // Embed issuerState in the code so the token endpoint can recover it
  const codeData = {
    uuid: crypto.randomUUID(),
    issuerState: issuerState || null
  };
  const code = Buffer.from(JSON.stringify(codeData)).toString('base64');

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectUrl);
}
