import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getDaysUntilDue(dueDate: Date): number {
  const today = new Date();
  const due = new Date(dueDate);
  const timeDiff = due.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

export function getUrgencyColor(daysUntil: number): string {
  if (daysUntil < 0) return 'text-red-600'; // Overdue
  if (daysUntil <= 1) return 'text-red-500'; // Due today/tomorrow
  if (daysUntil <= 3) return 'text-orange-500'; // Due soon
  if (daysUntil <= 7) return 'text-yellow-600'; // Due this week
  return 'text-gray-600'; // Not urgent
}

export function sortTasksByDueDate<T extends { dueDate: Date }>(tasks: T[]): T[] {
  return tasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}