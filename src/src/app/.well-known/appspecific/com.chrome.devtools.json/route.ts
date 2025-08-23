export async function GET() {
  // This file is requested by some Chromium-based devtools. It's harmless.
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
export const dynamic = 'force-dynamic';
