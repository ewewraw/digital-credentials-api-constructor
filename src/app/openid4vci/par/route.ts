import { parStorage } from '@/lib/par-storage';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  console.log('[PAR Endpoint] Received Request', Object.fromEntries(formData));

  const uuid = crypto.randomUUID();
  const requestUri = `urn:ietf:params:oauth:request_uri:mock-request-uri-${uuid}`;

  // Store the request parameters (including redirect_uri)
  const redirectUri = formData.get('redirect_uri') as string;
  const state = formData.get('state') as string;
  const issuerState = formData.get('issuer_state') as string;
  const codeChallenge = formData.get('code_challenge') as string;

  if (redirectUri) {
    parStorage.set(requestUri, JSON.stringify({ redirectUri, state, codeChallenge, issuerState }));
  }

  return NextResponse.json({
    request_uri: requestUri,
    expires_in: 600,
  }, { status: 201 });
}
