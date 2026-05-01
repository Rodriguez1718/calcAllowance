import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

export interface AppSettings {
  startDate: string;
  targetHours: number;
  hourlyRate: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  startDate: '2024-01-01',
  targetHours: 480,
  hourlyRate: 60,
};

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (e) {
    // If file doesn't exist, ensure directory exists and return defaults
    await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true }).catch(() => {});
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: Partial<AppSettings>) {
  const current = await getAppSettings();
  const updated = { ...current, ...settings };
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true }).catch(() => {});
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return updated;
}
