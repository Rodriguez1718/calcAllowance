import type { APIRoute } from 'astro';
import { getUserFromCode, createSession } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return Response.redirect(new URL('/?error=auth_failed', url.origin).toString(), 302);
  }

  try {
    const user = await getUserFromCode(code);
    const sessionId = createSession(user);

    const headers = new Headers();
    headers.set('Location', '/dashboard');
    headers.set(
      'Set-Cookie',
      `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    );

    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('OAuth callback error:', err);
    return Response.redirect(new URL('/?error=auth_failed', url.origin).toString(), 302);
  }
};
