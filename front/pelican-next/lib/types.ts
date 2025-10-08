export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  course?: string;
  isCompleted: boolean;
  extractedFromSyllabus?: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: Date;
  location?: string;
  type: 'club' | 'workshop' | 'academic' | 'other';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SidebarNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
}

export interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  className?: string;
}

export interface TaskItemProps {
  task: Task;
  onClick?: (task: Task) => void;
}

export interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskId: string) => void;
  onRemove: (taskId: string) => void;
}