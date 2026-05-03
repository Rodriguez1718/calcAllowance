import { supabase } from './supabase';

export interface TimeEntry {
  id: string;
  userId: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationSeconds: number;
}

export async function getManualEntries(userId: string): Promise<TimeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(e => ({
      id: e.id,
      userId: e.user_id,
      description: e.description,
      date: e.date,
      startTime: e.start_time.substring(0, 5),
      endTime: e.end_time.substring(0, 5),
      durationSeconds: e.duration_seconds
    }));
  } catch (e) {
    console.error('Error fetching entries:', e);
    return [];
  }
}

export async function addManualEntry(entry: Omit<TimeEntry, 'id' | 'durationSeconds'>) {
  const start = new Date(`${entry.date}T${entry.startTime}`);
  const end = new Date(`${entry.date}T${entry.endTime}`);
  
  if (end < start) throw new Error('End time must be after start time');

  const durationSeconds = (end.getTime() - start.getTime()) / 1000;
  
  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: entry.userId,
      description: entry.description,
      date: entry.date,
      start_time: entry.startTime,
      end_time: entry.endTime,
      duration_seconds: durationSeconds
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateManualEntry(id: string, entry: Omit<TimeEntry, 'id' | 'durationSeconds' | 'userId'>) {
  const start = new Date(`${entry.date}T${entry.startTime}`);
  const end = new Date(`${entry.date}T${entry.endTime}`);
  
  if (end < start) throw new Error('End time must be after start time');

  const durationSeconds = (end.getTime() - start.getTime()) / 1000;
  
  const { data, error } = await supabase
    .from('entries')
    .update({
      description: entry.description,
      date: entry.date,
      start_time: entry.startTime,
      end_time: entry.endTime,
      duration_seconds: durationSeconds
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteManualEntry(id: string) {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export interface ActiveTimer {
  userId: string;
  startTime: string; // ISO String
  description: string;
}

export async function getActiveTimer(userId: string): Promise<ActiveTimer | null> {
  try {
    const { data, error } = await supabase
      .from('active_timers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      userId: data.user_id,
      startTime: data.start_time,
      description: data.description
    };
  } catch {
    return null;
  }
}

export async function startTimer(userId: string, description: string = '') {
  const { data, error } = await supabase
    .from('active_timers')
    .upsert({
      user_id: userId,
      description,
      start_time: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTimerStart(userId: string, newStartTime: string) {
  const [h, m] = newStartTime.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);

  const { data, error } = await supabase
    .from('active_timers')
    .update({ start_time: date.toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function stopTimer(userId: string, description: string) {
  const timer = await getActiveTimer(userId);
  if (!timer) throw new Error('No active timer found');
  if (!description) throw new Error('Description is required to stop the timer');

  const now = new Date();
  const start = new Date(timer.startTime);
  
  // Force Philippine Time (Asia/Manila)
  const getPHT = (date: Date) => {
    return {
      date: date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }), // YYYY-MM-DD
      time: date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }) // HH:mm
    };
  };

  const startPHT = getPHT(start);
  const nowPHT = getPHT(now);
  
  await addManualEntry({
    userId,
    description,
    date: startPHT.date,
    startTime: startPHT.time,
    endTime: nowPHT.time
  });

  const { error } = await supabase
    .from('active_timers')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}
