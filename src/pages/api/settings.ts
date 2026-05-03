import type { APIRoute } from 'astro';
import { saveAppSettings } from '../../lib/settings';
import { getSession } from '../../lib/auth';
import { parse } from 'cookie';

export const POST: APIRoute = async ({ request }) => {
  // Simple auth check
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const session = cookies.session ? await getSession(cookies.session) : null;

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const formData = await request.formData();
    const role = formData.get('role') as 'student' | 'coordinator' || 'student';
    const inviteCode = formData.get('inviteCode') as string;
    const coordinatorInvite = formData.get('coordinatorInvite') as string;
    
    // Extract common fields
    const setupComplete = formData.get('setupComplete') === 'true';
    const redirectUrl = formData.get('redirect') as string || '/dashboard';
    
    // Extract OJT fields
    const startDate = formData.get('startDate') as string;
    const targetHours = parseFloat(formData.get('targetHours') as string);
    const hourlyRate = parseFloat(formData.get('hourlyRate') as string);
    const program = formData.get('program') as string;
    const hostCompany = formData.get('hostCompany') as string;
    const supervisor = formData.get('supervisor') as string;
    const supervisorPosition = formData.get('supervisorPosition') as string;
    const hasAllowance = formData.get('hasAllowance') === 'true';
    const payType = formData.get('payType') as 'hourly' | 'daily';
    const paySchedule = formData.get('paySchedule') as 'weekly' | 'semi-monthly' | 'monthly';

    let coordinatorId = undefined;
    if (role === 'student' && coordinatorInvite) {
      // Find coordinator by invite code in the NEW coordinator_settings table
      const { supabase } = await import('../../lib/supabase');
      const { data: coord } = await supabase
        .from('coordinator_settings')
        .select('user_id')
        .eq('invite_code', coordinatorInvite.toUpperCase().trim())
        .single();
      
      if (coord) coordinatorId = coord.user_id;
    }

    // Only validate OJT fields if user is a student
    if (role === 'student') {
      if (setupComplete && (!startDate || isNaN(targetHours) || isNaN(hourlyRate))) {
        throw new Error('Invalid data for student profile. Please ensure all required fields are filled.');
      }
    }

    await saveAppSettings(session.id, { 
      startDate, 
      targetHours: isNaN(targetHours) ? undefined : targetHours, 
      hourlyRate: isNaN(hourlyRate) ? undefined : hourlyRate, 
      setupComplete,
      program,
      hostCompany,
      supervisor,
      supervisorPosition,
      hasAllowance,
      payType,
      paySchedule,
      role,
      inviteCode: role === 'coordinator' ? inviteCode : undefined,
      coordinatorId,
      userName: session.name,
      userEmail: session.email,
      userPicture: session.picture
    });

    const finalUrl = new URL(redirectUrl, request.url);
    if (redirectUrl === '/settings') finalUrl.searchParams.set('success', 'true');
    return Response.redirect(finalUrl.toString(), 302);
  } catch (e) {
    console.error('Settings save error:', e);
    const errorMsg = encodeURIComponent(e.message);
    
    // Try to get redirectUrl again for error redirect
    let redirectUrl = '/dashboard';
    try {
      const freshFormData = await request.clone().formData();
      redirectUrl = freshFormData.get('redirect') as string || '/dashboard';
    } catch(err) {}

    const finalUrl = new URL(redirectUrl, request.url);
    finalUrl.searchParams.set('error', errorMsg);
    return Response.redirect(finalUrl.toString(), 302);
  }
};
