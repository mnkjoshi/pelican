import type { Task, Event } from '@/lib/types';

// Search functionality
export function searchTasks(tasks: Task[], query: string): Task[] {
  if (!query.trim()) return tasks;
  
  const searchTerm = query.toLowerCase().trim();
  
  return tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm) ||
    task.description?.toLowerCase().includes(searchTerm) ||
    task.course?.toLowerCase().includes(searchTerm)
  );
}

export function searchEvents(events: Event[], query: string): Event[] {
  if (!query.trim()) return events;
  
  const searchTerm = query.toLowerCase().trim();
  
  return events.filter(event => 
    event.title.toLowerCase().includes(searchTerm) ||
    event.description?.toLowerCase().includes(searchTerm) ||
    event.location?.toLowerCase().includes(searchTerm) ||
    event.type.toLowerCase().includes(searchTerm)
  );
}

// Task and Event creation utilities
export function createNewTask(
  title: string,
  description: string,
  dueDate: Date,
  course?: string
): Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  return {
    title: title.trim(),
    description: description.trim() || undefined,
    dueDate,
    course: course?.trim() || undefined,
    isCompleted: false,
    extractedFromSyllabus: false,
  };
}

export function createNewEvent(
  title: string,
  description: string,
  date: Date,
  location?: string,
  type: Event['type'] = 'other'
): Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  return {
    title: title.trim(),
    description: description.trim() || undefined,
    date,
    location: location?.trim() || undefined,
    type,
  };
}

// Generate unique IDs for new items
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}