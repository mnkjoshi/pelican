'use client';

import { Calendar, BookOpen, FileText } from 'lucide-react';
import { cn, formatDate, getDaysUntilDue, getUrgencyColor } from '@/lib/utils';
import type { TaskItemProps } from '@/lib/types';

export function TaskItem({ task, onClick }: TaskItemProps) {
  const daysUntil = getDaysUntilDue(task.dueDate);
  const urgencyColor = getUrgencyColor(daysUntil);

  const handleClick = () => {
    if (onClick) {
      onClick(task);
    }
  };

  const getDueDateText = () => {
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    return `Due in ${daysUntil} days`;
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer group',
        task.isCompleted 
          ? 'opacity-60 bg-gray-50 dark:bg-gray-800' 
          : 'bg-white dark:bg-gray-800 hover:border-orange-200 dark:hover:border-orange-400'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Task title */}
          <h3 className={cn(
            'font-medium text-gray-900 dark:text-white truncate',
            task.isCompleted && 'line-through text-gray-500 dark:text-gray-400'
          )}>
            {task.title}
          </h3>

          {/* Course info */}
          {task.course && (
            <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-300">
              <BookOpen className="h-3 w-3 mr-1" />
              <span className="truncate">{task.course}</span>
            </div>
          )}

          {/* Due date */}
          <div className={cn('flex items-center mt-2 text-sm', urgencyColor)}>
            <Calendar className="h-3 w-3 mr-1" />
            <span>{getDueDateText()}</span>
            <span className="ml-2 text-gray-400 dark:text-gray-500">
              ({formatDate(task.dueDate)})
            </span>
          </div>

          {/* Syllabus extraction indicator */}
          {task.extractedFromSyllabus && (
            <div className="flex items-center mt-2 text-xs text-blue-600 dark:text-blue-400">
              <FileText className="h-3 w-3 mr-1" />
              <span>Extracted from Syllabus</span>
            </div>
          )}
        </div>

        {/* Completion indicator */}
        <div className={cn(
          'ml-4 w-4 h-4 rounded-full border-2 flex-shrink-0',
          task.isCompleted 
            ? 'bg-green-500 border-green-500' 
            : 'border-gray-300 dark:border-gray-600 group-hover:border-orange-400'
        )}>
          {task.isCompleted && (
            <svg 
              className="w-full h-full text-white p-0.5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}