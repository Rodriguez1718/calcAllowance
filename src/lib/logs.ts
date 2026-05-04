import { supabase } from './supabase';

export type LogType = 'Sync' | 'Auth' | 'Mode' | 'Settings';
export type LogStatus = 'Success' | 'Error' | 'Warning';

export async function addSyncLog({
  userId,
  type,
  status,
  details,
  duration
}: {
  userId: string;
  type: LogType;
  status: LogStatus;
  details: string;
  duration?: string;
}) {
  try {
    const { error } = await supabase.from('sync_logs').insert({
      user_id: userId,
      type,
      status,
      details,
      duration: duration || '0.1s'
    });
    if (error) console.error('Failed to save sync log:', error);
  } catch (e) {
    console.error('Log error:', e);
  }
}
