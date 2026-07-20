const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
});

function toIsoLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isValidDateString(date: string): boolean {
  if (!date || typeof date !== 'string') {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00`);

  return !isNaN(parsed.getTime());
}

export function todayIsoDate(): string {
  return toIsoLocalDate(new Date());
}

export function shiftIsoDate(date: string, offsetDays: number): string {
  if (!isValidDateString(date)) {
    return '';
  }

  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + offsetDays);

  return toIsoLocalDate(nextDate);
}

export function getMinCashDate(): string {
  return shiftIsoDate(todayIsoDate(), -30);
}

export function isDateAfter(date: string, otherDate: string): boolean {
  return date > otherDate;
}

export function isDateBefore(date: string, otherDate: string): boolean {
  return date < otherDate;
}

export function formatDisplayDate(date: string): string {
  if (!isValidDateString(date)) {
    return '-';
  }

  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

export function formatShortDisplayDate(date: string): string {
  if (!isValidDateString(date)) {
    return '-';
  }

  return shortDateFormatter.format(new Date(`${date}T00:00:00`));
}

export function formatWeekday(date: string): string {
  if (!isValidDateString(date)) {
    return '-';
  }

  return weekdayFormatter.format(new Date(`${date}T00:00:00`));
}

export function isCashDay(date: string): boolean {
  if (!isValidDateString(date)) {
    return false;
  }

  const day = new Date(`${date}T00:00:00`).getDay();
  return day >= 1 && day <= 4;
}
