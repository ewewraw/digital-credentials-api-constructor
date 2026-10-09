import { createRequestUri, PUSHED_REQUEST_LIFETIME_SECONDS } from '@/lib/par-storage';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  console.log('[PAR Endpoint] Received Request', Object.fromEntries(formData));

  const field = (name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value : null;
  };

  const redirectUri = field('redirect_uri');
  if (!redirectUri) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing redirect_uri' },
      { status: 400 },
    );
  }

  // Carry the request parameters (including redirect_uri) in the request_uri
  const requestUri = createRequestUri({
    redirectUri,
    state: field('state'),
    issuerState: field('issuer_state'),
    codeChallenge: field('code_challenge'),
  });

  return NextResponse.json({
    request_uri: requestUri,
    expires_in: PUSHED_REQUEST_LIFETIME_SECONDS,
  }, { status: 201 });
}
