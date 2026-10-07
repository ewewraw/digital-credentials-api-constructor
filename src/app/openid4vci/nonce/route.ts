import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('[Nonce Endpoint] Received Request');
  // CMWallet might send URL-encoded form data or JSON.
  const body = await request.formData().catch((e) => {
      console.error('[Nonce Endpoint] Error parsing form data:', e);
         // Fallback to json if formData fails? Or just ignore body if it's a GET-like POST.
      return null;
  });
  console.log('[Nonce Endpoint] Body:', body);

  return NextResponse.json({
    c_nonce: 'mock-nonce-' + crypto.randomUUID(),
  });
}
