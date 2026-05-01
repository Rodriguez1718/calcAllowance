import { promises as fs } from 'fs';
import path from 'path';

const ENTRIES_FILE = path.join(process.cwd(), 'data', 'entries.json');

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
    const data = await fs.readFile(ENTRIES_FILE, 'utf-8');
    const allEntries = JSON.parse(data);
    return allEntries.filter((e: TimeEntry) => e.userId === userId);
  } catch (e) {
    await fs.mkdir(path.dirname(ENTRIES_FILE), { recursive: true }).catch(() => {});
    return [];
  }
}

export async function addManualEntry(entry: Omit<TimeEntry, 'id' | 'durationSeconds'>) {
  const start = new Date(`${entry.date}T${entry.startTime}`);
  const end = new Date(`${entry.date}T${entry.endTime}`);
  
  // Basic validation: end must be after start
  if (end < start) throw new Error('End time must be after start time');

  const durationSeconds = (end.getTime() - start.getTime()) / 1000;
  const newEntry: TimeEntry = {
    ...entry,
    id: crypto.randomUUID(),
    durationSeconds
  };

  const entries = await getAllEntries();
  entries.push(newEntry);
  await fs.writeFile(ENTRIES_FILE, JSON.stringify(entries, null, 2));
  return newEntry;
}

async function getAllEntries(): Promise<TimeEntry[]> {
  try {
    const data = await fs.readFile(ENTRIES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function deleteManualEntry(id: string) {
  const entries = await getAllEntries();
  const filtered = entries.filter(e => e.id !== id);
  await fs.writeFile(ENTRIES_FILE, JSON.stringify(filtered, null, 2));
}

const TIMER_FILE = path.join(process.cwd(), 'data', 'active_timer.json');

export interface ActiveTimer {
  userId: string;
  startTime: string; // ISO String
  description: string;
}

export async function getActiveTimer(userId: string): Promise<ActiveTimer | null> {
  try {
    const data = await fs.readFile(TIMER_FILE, 'utf-8');
    const timers = JSON.parse(data);
    return timers.find((t: ActiveTimer) => t.userId === userId) || null;
  } catch {
    return null;
  }
}

export async function startTimer(userId: string, description: string = '') {
  const timers = await getAllTimers();
  const index = timers.findIndex(t => t.userId === userId);
  const newTimer = { userId, description, startTime: new Date().toISOString() };
  
  if (index !== -1) timers[index] = newTimer;
  else timers.push(newTimer);
  
  await fs.writeFile(TIMER_FILE, JSON.stringify(timers, null, 2));
  return newTimer;
}

export async function updateTimerStart(userId: string, newStartTime: string) {
  const timers = await getAllTimers();
  const index = timers.findIndex(t => t.userId === userId);
  if (index === -1) throw new Error('No active timer found');

  // Convert time string (HH:mm) to a full ISO date for today
  const [h, m] = newStartTime.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);

  timers[index].startTime = date.toISOString();
  await fs.writeFile(TIMER_FILE, JSON.stringify(timers, null, 2));
  return timers[index];
}

export async function stopTimer(userId: string, description: string) {
  const timer = await getActiveTimer(userId);
  if (!timer) throw new Error('No active timer found');
  if (!description) throw new Error('Description is required to stop the timer');

  const now = new Date();
  const start = new Date(timer.startTime);
  
  await addManualEntry({
    userId,
    description,
    date: start.toISOString().split('T')[0],
    startTime: start.toTimeString().substring(0, 5),
    endTime: now.toTimeString().substring(0, 5)
  });

  const timers = await getAllTimers();
  const filtered = timers.filter(t => t.userId !== userId);
  await fs.writeFile(TIMER_FILE, JSON.stringify(filtered, null, 2));
}

async function getAllTimers(): Promise<ActiveTimer[]> {
  try {
    const data = await fs.readFile(TIMER_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}
