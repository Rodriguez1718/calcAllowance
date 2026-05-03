const CLOCKIFY_API_URL = 'https://api.clockify.me/api/v1';

export async function getClockifyUser(email: string) {
  const apiKey = import.meta.env.CLOCKIFY_API_KEY;
  const workspaceId = import.meta.env.CLOCKIFY_WORKSPACE_ID;

  if (!apiKey || !workspaceId) {
    throw new Error('Clockify credentials not configured');
  }

  // First, find the user by email in the workspace
  const response = await fetch(`${CLOCKIFY_API_URL}/workspaces/${workspaceId}/users`, {
    headers: {
      'X-Api-Key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users from Clockify');
  }

  const users = await response.json();
  const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  return user;
}

export async function getRenderedHours(clockifyUserId: string, startDate?: string) {
  const apiKey = import.meta.env.CLOCKIFY_API_KEY;
  const workspaceId = import.meta.env.CLOCKIFY_WORKSPACE_ID;

  if (!apiKey || !workspaceId) {
    throw new Error('Clockify credentials not configured');
  }

  let totalSeconds = 0;
  let page = 1;
  const pageSize = 50;
  let hasMore = true;
  const monthlyBreakdown: Record<string, number> = {};

  while (hasMore) {
    const start = startDate ? new Date(startDate).toISOString() : '2024-01-01T00:00:00Z';
    const response = await fetch(
      `${CLOCKIFY_API_URL}/workspaces/${workspaceId}/user/${clockifyUserId}/time-entries?page=${page}&page-size=${pageSize}&start=${start}`,
      {
        headers: {
          'X-Api-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page} from Clockify`);
    }

    const entries = await response.json();
    
    if (entries.length === 0) {
      hasMore = false;
    } else {
      for (const entry of entries) {
        if (entry.timeInterval && entry.timeInterval.duration) {
          const seconds = parseIsoDuration(entry.timeInterval.duration);
          totalSeconds += seconds;

          // Monthly grouping in Manila time
          const entryDate = new Date(entry.timeInterval.start);
          const year = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Manila' }).format(entryDate);
          const month = new Intl.DateTimeFormat('en-US', { month: '2-digit', timeZone: 'Asia/Manila' }).format(entryDate);
          const monthKey = `${year}-${month}`;
          monthlyBreakdown[monthKey] = (monthlyBreakdown[monthKey] || 0) + seconds;
        }
      }
      
      page++;
      if (entries.length < pageSize) {
        hasMore = false;
      }
    }
  }

  return {
    totalHours: totalSeconds / 3600,
    monthlyBreakdown: Object.entries(monthlyBreakdown).map(([month, seconds]) => ({
      month,
      hours: seconds / 3600,
    })).sort((a, b) => b.month.localeCompare(a.month))
  };
}

export async function getDailyDTR(clockifyUserId: string, year: number, month: number) {
  const apiKey = import.meta.env.CLOCKIFY_API_KEY;
  const workspaceId = import.meta.env.CLOCKIFY_WORKSPACE_ID;

  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();

  const response = await fetch(
    `${CLOCKIFY_API_URL}/workspaces/${workspaceId}/user/${clockifyUserId}/time-entries?start=${start}&end=${end}&page-size=1000`,
    { headers: { 'X-Api-Key': apiKey } }
  );

  if (!response.ok) throw new Error('Failed to fetch DTR data');
  const entries = await response.json();

  const daysInMonth = new Date(year, month, 0).getDate();
  const dtr: Record<number, any> = {};

  // Initialize all days
  for (let i = 1; i <= daysInMonth; i++) {
    dtr[i] = { amIn: '', amOut: '', pmIn: '', pmOut: '', totalSeconds: 0 };
  }

  // Sort entries by start time ascending
  entries.sort((a: any, b: any) => 
    new Date(a.timeInterval.start).getTime() - new Date(b.timeInterval.start).getTime()
  );

  for (const entry of entries) {
    const start = new Date(entry.timeInterval.start);
    const end = new Date(entry.timeInterval.end);
    
    const day = parseInt(new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'Asia/Manila' }).format(start));
    const startHour = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }).format(start));
    const endHour = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }).format(end));
    const duration = parseIsoDuration(entry.timeInterval.duration);
    
    const timeStr = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });

    if (dtr[day]) {
      dtr[day].totalSeconds += duration;

      if (startHour < 12) {
        // Morning Block: starts before 12 PM
        if (!dtr[day].amIn) dtr[day].amIn = timeStr(start);
        // amOut is the latest end time of any session that started in the morning
        dtr[day].amOut = timeStr(end);
      } else {
        // Afternoon Block: starts at or after 12 PM
        if (!dtr[day].pmIn) dtr[day].pmIn = timeStr(start);
        // pmOut is the latest end time of any session that started in the afternoon
        dtr[day].pmOut = timeStr(end);
      }
    }
  }

  return dtr;
}

function parseIsoDuration(duration: string) {
  if (!duration) return 0;
  const regex = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  if (!matches) return 0;
  const days = parseInt(matches[1] || '0', 10);
  const hours = parseInt(matches[2] || '0', 10);
  const minutes = parseInt(matches[3] || '0', 10);
  const seconds = parseInt(matches[4] || '0', 10);
  return (days * 24 * 3600) + (hours * 3600) + (minutes * 60) + seconds;
}

export async function getRecentEntries(clockifyUserId: string) {
  const apiKey = import.meta.env.CLOCKIFY_API_KEY;
  const workspaceId = import.meta.env.CLOCKIFY_WORKSPACE_ID;

  const response = await fetch(
    `${CLOCKIFY_API_URL}/workspaces/${workspaceId}/user/${clockifyUserId}/time-entries?page-size=4`,
    { headers: { 'X-Api-Key': apiKey } }
  );

  if (!response.ok) return [];
  const entries = await response.json();
  
  return entries.map((e: any) => ({
    description: e.description || 'Working on tasks',
    startTime: new Date(e.timeInterval.start).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' }),
    duration: parseIsoDuration(e.timeInterval.duration)
  }));
}
