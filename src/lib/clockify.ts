import { supabase } from './supabase';

const CLOCKIFY_API_URL = 'https://api.clockify.me/api/v1';

export async function getClockifyUser(email: string) {
  const apiKey = import.meta.env.CLOCKIFY_API_KEY;
  const workspaceId = import.meta.env.CLOCKIFY_WORKSPACE_ID;
  if (!apiKey || !workspaceId) return null;
  try {
    const response = await fetch(`${CLOCKIFY_API_URL}/workspaces/${workspaceId}/users`, {
      headers: { 'X-Api-Key': apiKey },
    });
    if (!response.ok) return null;
    const users = await response.json();
    return users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  } catch { return null; }
}

export async function getRenderedHours(clockifyUserId: string, startDate?: string) {
  const apiKey = import.meta.env.CLOCKIFY_API_KEY;
  const workspaceId = import.meta.env.CLOCKIFY_WORKSPACE_ID;
  let totalSeconds = 0;
  let page = 1;
  const pageSize = 50;
  let hasMore = true;
  const allEntries: { date: string, durationSeconds: number }[] = [];

  while (hasMore) {
    const start = startDate ? new Date(startDate).toISOString() : '2024-01-01T00:00:00Z';
    const response = await fetch(
      `${CLOCKIFY_API_URL}/workspaces/${workspaceId}/user/${clockifyUserId}/time-entries?page=${page}&page-size=${pageSize}&start=${start}`,
      { headers: { 'X-Api-Key': apiKey } }
    );
    if (!response.ok) break;
    const entries = await response.json();
    if (entries.length === 0) {
      hasMore = false;
    } else {
      for (const entry of entries) {
        if (entry.timeInterval && entry.timeInterval.duration) {
          const seconds = parseIsoDuration(entry.timeInterval.duration);
          totalSeconds += seconds;
          const date = new Date(entry.timeInterval.start);
          const isoDate = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
          allEntries.push({ date: isoDate, durationSeconds: seconds });
        }
      }
      page++;
      if (entries.length < pageSize) hasMore = false;
    }
  }
  return { totalHours: totalSeconds / 3600, entries: allEntries };
}

export async function getStudentProgress(userId: string, email: string, startDate?: string) {
  const { data: settings } = await supabase.from('student_settings').select('rendered_hours').eq('user_id', userId).single();
  let manualHours = settings?.rendered_hours || 0;
  let clockifyHours = 0;
  try {
    const clockifyUser = await getClockifyUser(email);
    if (clockifyUser) {
      const data = await getRenderedHours(clockifyUser.id, startDate);
      clockifyHours = data.totalHours;
    }
  } catch (e) {}
  return Number(manualHours) + clockifyHours;
}

export async function getDailyDTR(clockifyUserId: string, month: number, year: number, manualEntries: any[] = []) {
  const apiKey = import.meta.env.CLOCKIFY_API_KEY;
  const workspaceId = import.meta.env.CLOCKIFY_WORKSPACE_ID;
  const dtr: Record<number, any> = {};
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    dtr[i] = { amIn: '', amOut: '', pmIn: '', pmOut: '', totalSeconds: 0 };
  }

  const format12 = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true, 
      timeZone: 'Asia/Manila' 
    });
  };

  const allEntries: { start: Date, end: Date, duration: number }[] = [];

  // 1. Collect Manual Entries
  for (const entry of manualEntries) {
    try {
      const s = new Date(entry.startFull);
      const e = new Date(entry.endFull);
      if (!isNaN(s.getTime())) {
        allEntries.push({ start: s, end: e, duration: entry.durationSeconds });
      }
    } catch (e) {}
  }

  // 2. Collect Clockify Entries
  if (clockifyUserId && apiKey && workspaceId) {
    try {
      const startIso = new Date(year, month - 1, 1).toISOString();
      const endIso = new Date(year, month, 0, 23, 59, 59).toISOString();
      const response = await fetch(
        `${CLOCKIFY_API_URL}/workspaces/${workspaceId}/user/${clockifyUserId}/time-entries?start=${startIso}&end=${endIso}&page-size=1000`,
        { headers: { 'X-Api-Key': apiKey } }
      );
      if (response.ok) {
        const entries = await response.json();
        for (const entry of entries) {
          if (entry.timeInterval && entry.timeInterval.end) {
            const s = new Date(entry.timeInterval.start);
            const e = new Date(entry.timeInterval.end);
            const dur = parseIsoDuration(entry.timeInterval.duration);
            allEntries.push({ start: s, end: e, duration: dur });
          }
        }
      }
    } catch (e) {}
  }

  // 3. Process day-by-day
  const dailyGroups: Record<number, typeof allEntries> = {};
  allEntries.forEach(entry => {
    const dayStr = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'Asia/Manila' }).format(entry.start);
    const day = parseInt(dayStr);
    if (!dailyGroups[day]) dailyGroups[day] = [];
    dailyGroups[day].push(entry);
  });

  for (const [day, dayLogs] of Object.entries(dailyGroups)) {
    const d = parseInt(day);
    if (!dtr[d]) continue;

    dayLogs.sort((a, b) => a.start.getTime() - b.start.getTime());

    const firstStartH = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }).format(dayLogs[0].start));
    
    dtr[d].totalSeconds = dayLogs.reduce((acc, log) => acc + log.duration, 0);

    if (firstStartH >= 12) {
      dtr[d].pmIn = format12(dayLogs[0].start);
      dtr[d].pmOut = format12(dayLogs[dayLogs.length - 1].end);
    } else {
      let lunchBreakIndex = -1;
      let maxGap = 0;
      
      for (let i = 0; i < dayLogs.length - 1; i++) {
        const end = dayLogs[i].end.getTime();
        const nextStart = dayLogs[i + 1].start.getTime();
        const gap = nextStart - end;
        const endH = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }).format(dayLogs[i].end));
        
        if (gap > 20 * 60 * 1000 && endH >= 11 && endH <= 14) {
           if (gap > maxGap) {
             maxGap = gap;
             lunchBreakIndex = i;
           }
        }
      }

      if (lunchBreakIndex !== -1) {
        dtr[d].amIn = format12(dayLogs[0].start);
        dtr[d].amOut = format12(dayLogs[lunchBreakIndex].end);
        dtr[d].pmIn = format12(dayLogs[lunchBreakIndex + 1].start);
        dtr[d].pmOut = format12(dayLogs[dayLogs.length - 1].end);
      } else {
        dtr[d].amIn = format12(dayLogs[0].start);
        dtr[d].amOut = format12(dayLogs[dayLogs.length - 1].end);
      }
    }
  }

  // Convert back to sorted list for the DTR page
  const days = Object.keys(dtr).map(d => ({ day: d, ...dtr[parseInt(d)] }));
  const totalMonthlyHours = days.reduce((acc, d) => acc + (d.totalSeconds / 3600), 0);
  return { days, totalMonthlyHours };
}

function parseIsoDuration(duration: string) {
  if (!duration) return 0;
  const regex = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  if (!matches) return 0;
  return (parseInt(matches[1] || '0') * 86400) + (parseInt(matches[2] || '0') * 3600) + (parseInt(matches[3] || '0') * 60) + parseInt(matches[4] || '0');
}
