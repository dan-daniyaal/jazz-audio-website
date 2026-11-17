import type { DayHours, OpenStatus, WeekHours } from '../data/types';

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function localParts(timeZone: string, now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  let weekday = '';
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === 'weekday') weekday = p.value;
    else if (p.type === 'hour') hour = parseInt(p.value, 10) % 24;
    else if (p.type === 'minute') minute = parseInt(p.value, 10);
  }
  return { day: SHORT.indexOf(weekday), minutes: hour * 60 + minute };
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function computeStatus(hours: WeekHours, timeZone: string, now: Date): OpenStatus {
  const { day, minutes } = localParts(timeZone, now);
  const today: DayHours = hours[day];

  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return { isOpen: true, label: `Open now · until ${formatTime(today.close)}`, todayIndex: day };
  }

  if (today && minutes < toMinutes(today.open)) {
    return { isOpen: false, label: `Closed · opens ${formatTime(today.open)}`, todayIndex: day };
  }

  for (let offset = 1; offset <= 7; offset++) {
    const idx = (day + offset) % 7;
    const next = hours[idx];
    if (next) {
      const when = offset === 1 ? 'tomorrow' : FULL[idx];
      return {
        isOpen: false,
        label: `Closed · opens ${when} ${formatTime(next.open)}`,
        todayIndex: day,
      };
    }
  }

  return { isOpen: false, label: 'Closed', todayIndex: day };
}

export function hoursRows(
  hours: WeekHours,
  timeZone: string,
  now: Date,
): { day: string; text: string; isToday: boolean }[] {
  const { day } = localParts(timeZone, now);
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((i) => {
    const h = hours[i];
    return {
      day: FULL[i],
      text: h ? `${formatTime(h.open)} to ${formatTime(h.close)}` : 'Closed',
      isToday: i === day,
    };
  });
}
