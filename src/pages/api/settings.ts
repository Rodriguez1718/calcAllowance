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
    const setupComplete = formData.get('setupComplete') === 'true';
    const redirectUrl = formData.get('redirect') as string || '/settings';

    if (!startDate || isNaN(targetHours) || isNaN(hourlyRate)) {
      return new Response('Invalid data', { status: 400 });
    }

    await saveAppSettings(session.id, { startDate, targetHours, hourlyRate, setupComplete });

    const finalUrl = new URL(redirectUrl, request.url);
    if (redirectUrl === '/settings') finalUrl.searchParams.set('success', 'true');
    return Response.redirect(finalUrl.toString(), 302);
  } catch (e) {
    console.error('Settings save error:', e);
    const errorMsg = encodeURIComponent(e.message);
    const redirectUrl = (await request.formData().catch(() => null))?.get('redirect') as string || '/settings';
    const finalUrl = new URL(redirectUrl, request.url);
    finalUrl.searchParams.set('error', errorMsg);
    return Response.redirect(finalUrl.toString(), 302);
  }
};
