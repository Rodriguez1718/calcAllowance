import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

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
    hd: data.hd, // hosted domain (ctu.edu.ph)
  };
}

// Simple in-memory session store (for dev; use Redis/DB in production)
const sessions = new Map<string, { user: any; expires: number }>();

export function createSession(user: any): string {
  const id = crypto.randomUUID();
  sessions.set(id, {
    user,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  });
  return id;
}

export function getSession(id: string) {
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() > session.expires) {
    sessions.delete(id);
    return null;
  }
  return session.user;
}

export function destroySession(id: string) {
  sessions.delete(id);
}
