import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

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

function getSettingsPath(userId: string) {
  return path.join(process.cwd(), 'data', `settings_${userId}.json`);
}

export async function getAppSettings(userId: string): Promise<AppSettings> {
  try {
    const data = await fs.readFile(getSettingsPath(userId), 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (e) {
    await fs.mkdir(path.dirname(getSettingsPath(userId)), { recursive: true }).catch(() => {});
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(userId: string, settings: Partial<AppSettings>) {
  const current = await getAppSettings(userId);
  const updated = { ...current, ...settings };
  const filePath = getSettingsPath(userId);
  await fs.mkdir(path.dirname(filePath), { recursive: true }).catch(() => {});
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
  return updated;
}
