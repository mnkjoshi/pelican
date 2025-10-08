import type { Task, Event } from '@/lib/types';

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Submit Final Research Paper',
    description: 'Complete and submit the final research paper on machine learning applications in healthcare.',
    dueDate: new Date('2025-10-15T23:59:00'),
    course: 'CS 485 - Machine Learning',
    isCompleted: false,
    extractedFromSyllabus: true,
    userId: 'user1',
    createdAt: new Date('2025-10-01T10:00:00'),
    updatedAt: new Date('2025-10-01T10:00:00'),
  },
  {
    id: '2',
    title: 'Linear Algebra Problem Set 8',
    description: 'Complete problems 1-15 from Chapter 8 on eigenvalues and eigenvectors.',
    dueDate: new Date('2025-10-09T11:30:00'),
    course: 'MATH 240 - Linear Algebra',
    isCompleted: false,
    extractedFromSyllabus: true,
    userId: 'user1',
    createdAt: new Date('2025-10-01T10:00:00'),
    updatedAt: new Date('2025-10-01T10:00:00'),
  },
  {
    id: '3',
    title: 'Prepare presentation for Database Design',
    description: 'Create slides and prepare 10-minute presentation on normalization techniques.',
    dueDate: new Date('2025-10-12T14:00:00'),
    course: 'CS 360 - Database Systems',
    isCompleted: false,
    extractedFromSyllabus: false,
    userId: 'user1',
    createdAt: new Date('2025-10-05T15:30:00'),
    updatedAt: new Date('2025-10-05T15:30:00'),
  },
  {
    id: '4',
    title: 'Read Chapter 12 - Microeconomics',
    description: 'Read and take notes on Chapter 12: Market Structures and Competition.',
    dueDate: new Date('2025-10-08T09:00:00'),
    course: 'ECON 201 - Principles of Economics',
    isCompleted: true,
    extractedFromSyllabus: true,
    userId: 'user1',
    createdAt: new Date('2025-09-28T08:00:00'),
    updatedAt: new Date('2025-10-06T20:15:00'),
  },
  {
    id: '5',
    title: 'Lab Report: Chemical Equilibrium',
    description: 'Write lab report analyzing the Le Chatelier\'s principle experiment.',
    dueDate: new Date('2025-10-14T17:00:00'),
    course: 'CHEM 202 - Organic Chemistry',
    isCompleted: false,
    extractedFromSyllabus: true,
    userId: 'user1',
    createdAt: new Date('2025-10-02T11:20:00'),
    updatedAt: new Date('2025-10-02T11:20:00'),
  },
  {
    id: '6',
    title: 'Review for Midterm Exam',
    description: 'Study chapters 1-6 for the upcoming midterm examination.',
    dueDate: new Date('2025-10-11T08:00:00'),
    course: 'PHYS 301 - Thermodynamics',
    isCompleted: false,
    extractedFromSyllabus: false,
    userId: 'user1',
    createdAt: new Date('2025-10-04T16:45:00'),
    updatedAt: new Date('2025-10-04T16:45:00'),
  },
];

export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Computer Science Club Meeting',
    description: 'Monthly meeting to discuss upcoming hackathon and guest speakers.',
    date: new Date('2025-10-10T18:00:00'),
    location: 'Engineering Building, Room 205',
    type: 'club',
    userId: 'user1',
    createdAt: new Date('2025-09-15T12:00:00'),
    updatedAt: new Date('2025-09-15T12:00:00'),
  },
  {
    id: '2',
    title: 'Career Fair',
    description: 'Annual career fair with 50+ companies recruiting students.',
    date: new Date('2025-10-16T10:00:00'),
    location: 'Student Union Ballroom',
    type: 'academic',
    userId: 'user1',
    createdAt: new Date('2025-09-20T10:30:00'),
    updatedAt: new Date('2025-09-20T10:30:00'),
  },
  {
    id: '3',
    title: 'React Development Workshop',
    description: 'Hands-on workshop covering React hooks and state management.',
    date: new Date('2025-10-13T15:00:00'),
    location: 'Computer Lab A',
    type: 'workshop',
    userId: 'user1',
    createdAt: new Date('2025-10-01T09:15:00'),
    updatedAt: new Date('2025-10-01T09:15:00'),
  },
  {
    id: '4',
    title: 'Study Group - Linear Algebra',
    description: 'Weekly study group session to review problem sets and concepts.',
    date: new Date('2025-10-09T19:00:00'),
    location: 'Library, Study Room 3B',
    type: 'academic',
    userId: 'user1',
    createdAt: new Date('2025-09-25T14:20:00'),
    updatedAt: new Date('2025-09-25T14:20:00'),
  },
];

// Helper function to get tasks due soon (next 7 days)
export function getUpcomingTasks(tasks: Task[]): Task[] {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return tasks
    .filter(task => !task.isCompleted && task.dueDate <= nextWeek)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

// Helper function to get incomplete tasks
export function getIncompleteTasks(tasks: Task[]): Task[] {
  return tasks.filter(task => !task.isCompleted);
}

// Helper function to get upcoming events (next 14 days)
export function getUpcomingEvents(events: Event[]): Event[] {
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  
  return events
    .filter(event => event.date >= now && event.date <= twoWeeksFromNow)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}