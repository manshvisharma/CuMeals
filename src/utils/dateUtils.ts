export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateObj(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDateObj(date);
}

export function getDayNumber(dateStr: string): number {
  const [, , d] = dateStr.split('-').map(Number);
  return d;
}

export function getShortDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

export function getFullDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

export function getFormattedDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${d} ${months[date.getMonth()]} ${y}`;
}

export function getRelativeDayLabel(dateStr: string): string {
  const today = getTodayString();
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, 1)) return 'Tomorrow';
  if (dateStr === addDays(today, -1)) return 'Yesterday';
  return getFullDayName(dateStr);
}

export function getSurroundingDates(centerDateStr: string, radius = 3): string[] {
  const dates: string[] = [];
  for (let i = -radius; i <= radius; i++) {
    dates.push(addDays(centerDateStr, i));
  }
  return dates;
}

export interface MealTimeStatus {
  status: 'upcoming' | 'ongoing' | 'completed' | 'unknown';
  progressPercent: number;
  timeRemainingText?: string;
}

export function parseTimeToMinutes(timePart: string): number | null {
  try {
    const match = timePart.trim().match(/(\d+):(\d+)\s*(AM|PM|am|pm)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } catch {
    return null;
  }
}

export function getMealTimeStatus(timeRangeStr: string, targetDateStr: string): MealTimeStatus {
  const todayStr = getTodayString();
  if (targetDateStr < todayStr) {
    return { status: 'completed', progressPercent: 100, timeRemainingText: 'Ended' };
  }
  if (targetDateStr > todayStr) {
    return { status: 'upcoming', progressPercent: 0, timeRemainingText: 'Upcoming' };
  }

  const parts = timeRangeStr.split('-');
  if (parts.length !== 2) {
    return { status: 'unknown', progressPercent: 0 };
  }

  const startMins = parseTimeToMinutes(parts[0]);
  const endMins = parseTimeToMinutes(parts[1]);

  if (startMins === null || endMins === null) {
    return { status: 'unknown', progressPercent: 0 };
  }

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  if (currentMins < startMins) {
    const minsUntilStart = startMins - currentMins;
    const hrs = Math.floor(minsUntilStart / 60);
    const mins = minsUntilStart % 60;
    const label = hrs > 0 ? `Starts in ${hrs}h ${mins}m` : `Starts in ${mins}m`;
    return { status: 'upcoming', progressPercent: 0, timeRemainingText: label };
  }

  if (currentMins >= startMins && currentMins <= endMins) {
    const duration = Math.max(1, endMins - startMins);
    const elapsed = currentMins - startMins;
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)));
    const minsLeft = endMins - currentMins;
    const hrs = Math.floor(minsLeft / 60);
    const mins = minsLeft % 60;
    const label = hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
    return { status: 'ongoing', progressPercent, timeRemainingText: label };
  }

  return { status: 'completed', progressPercent: 100, timeRemainingText: 'Ended' };
}
