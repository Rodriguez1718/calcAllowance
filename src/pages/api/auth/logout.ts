import type { APIRoute } from 'astro';
import { destroySession } from '../../../lib/auth';
import { parse } from 'cookie';

export const GET: APIRoute = async ({ request }) => {
  const cookies = parse(request.headers.get('cookie') || '');
  const sessionId = cookies.session;

  if (sessionId) {
    await destroySession(sessionId);
  }

  const headers = new Headers();
  headers.set('Location', '/');
  headers.set('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');

  return new Response(null, { status: 302, headers });
};
