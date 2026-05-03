import { supabase } from './supabase';

export interface AppSettings {
  startDate: string;
  targetHours: number;
  hourlyRate: number;
  setupComplete: boolean;
  program: string;
  hostCompany: string;
  supervisor: string;
  supervisorPosition: string;
  hasAllowance: boolean;
  payType: 'hourly' | 'daily';
  paySchedule: 'weekly' | 'semi-monthly' | 'monthly';
}

const DEFAULT_SETTINGS: AppSettings = {
  startDate: '2024-01-01',
  targetHours: 480,
  hourlyRate: 60,
  setupComplete: false,
  program: 'Enter Program / Course',
  hostCompany: 'Enter Host Company',
  supervisor: 'Enter Supervisor Name',
  supervisorPosition: 'Enter Position',
  hasAllowance: true,
  payType: 'hourly',
  paySchedule: 'monthly',
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
      program: data.program || DEFAULT_SETTINGS.program,
      hostCompany: data.host_company || DEFAULT_SETTINGS.hostCompany,
      supervisor: data.supervisor || DEFAULT_SETTINGS.supervisor,
      supervisorPosition: data.supervisor_position || DEFAULT_SETTINGS.supervisorPosition,
      hasAllowance: data.has_allowance ?? DEFAULT_SETTINGS.hasAllowance,
      payType: data.pay_type || DEFAULT_SETTINGS.payType,
      paySchedule: data.pay_schedule || DEFAULT_SETTINGS.paySchedule,
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
      program: updated.program,
      host_company: updated.hostCompany,
      supervisor: updated.supervisor,
      supervisor_position: updated.supervisorPosition,
      has_allowance: updated.hasAllowance,
      pay_type: updated.payType,
      pay_schedule: updated.paySchedule,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  return updated;
}
