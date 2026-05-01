import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

import { supabase } from './supabase';

// ... SCOPES and other functions remain same ...

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    import.meta.env.GOOGLE_CLIENT_ID,
    import.meta.env.GOOGLE_CLIENT_SECRET,
    import.meta.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function getUserFromCode(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    hd: data.hd,
  };
}

export async function createSession(user: any): Promise<string> {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(); // 30 days
  
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_data: user,
      expires_at: expiresAt
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function getSession(id: string) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    if (new Date() > new Date(data.expires_at)) {
      await destroySession(id);
      return null;
    }

    return data.user_data;
  } catch {
    return null;
  }
}

export async function destroySession(id: string) {
  await supabase.from('sessions').delete().eq('id', id);
}
