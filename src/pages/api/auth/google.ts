import type { APIRoute } from 'astro';
import { getAuthUrl } from '../../../lib/auth';

export const GET: APIRoute = async () => {
  const url = getAuthUrl();
  return Response.redirect(url, 302);
};
