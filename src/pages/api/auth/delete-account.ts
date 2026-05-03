import type { APIRoute } from 'astro';
import { getSession, destroySession, deleteAccount } from '../../../lib/auth';
import { parse } from 'cookie';

export const POST: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const sessionId = cookies.session;
  const user = sessionId ? await getSession(sessionId) : null;

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Delete all user data from Supabase
    await deleteAccount(user.id);

    // 2. Destroy the current session
    await destroySession(sessionId);

    // 3. Clear the cookie and redirect
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
      }
    });
  } catch (e) {
    console.error('Delete account error:', e);
    return new Response('Error deleting account', { status: 500 });
  }
};
