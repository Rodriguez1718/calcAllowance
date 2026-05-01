import { supabase } from './supabase';

export interface AppSettings {
  startDate: string;
  targetHours: number;
  hourlyRate: number;
  setupComplete: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  startDate: '2024-01-01',
  targetHours: 480,
  hourlyRate: 60,
  setupComplete: false,
};

export async function getAppSettings(userId: string): Promise<AppSettings> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return DEFAULT_SETTINGS;
    }

    return {
      startDate: data.start_date,
      targetHours: Number(data.target_hours),
      hourlyRate: Number(data.hourly_rate),
      setupComplete: data.setup_complete,
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(userId: string, settings: Partial<AppSettings>) {
  const current = await getAppSettings(userId);
  const updated = { ...current, ...settings };

  const { error } = await supabase
    .from('settings')
    .upsert({
      user_id: userId,
      start_date: updated.startDate,
      target_hours: updated.targetHours,
      hourly_rate: updated.hourlyRate,
      setup_complete: updated.setupComplete,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  return updated;
}
