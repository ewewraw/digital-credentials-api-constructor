import { NextResponse } from 'next/server';
import { resolveRequestUri } from '@/lib/par-storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');

  const requestUri = searchParams.get('request_uri');

  if (requestUri) {
    // If request_uri is present, we must use the pushed parameters
    const pushed = resolveRequestUri(requestUri);
    if (pushed) {
      return handleRedirect(pushed.redirectUri, pushed.state || state, pushed.issuerState);
    }
    // If we can't resolve it, we might fall back or error.
    console.warn('[Auth Endpoint] Invalid or expired request_uri');
  }

  if (!redirectUri) {
    return new NextResponse('Missing redirect_uri', { status: 400 });
  }

  return handleRedirect(redirectUri, state, searchParams.get('issuer_state'));
}

function handleRedirect(redirectUri: string, state: string | null, issuerState?: string | null) {
  // Mock auto-approval
  // TODO(security): A production authorization server authenticates the user
  // here and only redirects to URIs registered for the client.
  // Embed issuerState in the code so the token endpoint can recover it
  const codeData = {
    uuid: crypto.randomUUID(),
    issuerState: issuerState || null
  };
  const code = Buffer.from(JSON.stringify(codeData)).toString('base64');

  let redirectUrl: URL;
  try {
    redirectUrl = new URL(redirectUri);
  } catch {
    return new NextResponse('Invalid redirect_uri', { status: 400 });
  }
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectUrl);
}
