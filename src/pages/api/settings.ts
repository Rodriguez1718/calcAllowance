import type { APIRoute } from 'astro';
import { saveAppSettings } from '../../lib/settings';
import { getSession } from '../../lib/auth';
import { parse } from 'cookie';

export const POST: APIRoute = async ({ request }) => {
  // Simple auth check
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const session = cookies.session ? getSession(cookies.session) : null;

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const formData = await request.formData();
    const startDate = formData.get('startDate') as string;
    const targetHours = parseFloat(formData.get('targetHours') as string);
    const hourlyRate = parseFloat(formData.get('hourlyRate') as string);

    if (!startDate || isNaN(targetHours) || isNaN(hourlyRate)) {
      return new Response('Invalid data', { status: 400 });
    }

    await saveAppSettings({ startDate, targetHours, hourlyRate });

    const successUrl = new URL('/settings?success=true', request.url);
    return Response.redirect(successUrl.toString(), 302);
  } catch (e) {
    console.error('Settings save error:', e);
    const errorMsg = encodeURIComponent(e.message);
    const errorUrl = new URL(`/settings?error=${errorMsg}`, request.url);
    return Response.redirect(errorUrl.toString(), 302);
  }
};
