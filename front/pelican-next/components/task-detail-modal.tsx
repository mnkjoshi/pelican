'use client';

import { useEffect } from 'react';
import { X, Calendar, BookOpen, FileText, Check, Trash2 } from 'lucide-react';
import { cn, formatDate, formatTime, getDaysUntilDue, getUrgencyColor } from '@/lib/utils';
import type { TaskDetailModalProps } from '@/lib/types';

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onComplete,
  onRemove,
}: TaskDetailModalProps) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const daysUntil = getDaysUntilDue(task.dueDate);
  const urgencyColor = getUrgencyColor(daysUntil);

  const getDueDateText = () => {
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    return `Due in ${daysUntil} days`;
  };

  const handleComplete = () => {
    onComplete(task.id);
    onClose();
  };

  const handleRemove = () => {
    if (confirm('Are you sure you want to remove this task?')) {
      onRemove(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Task Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Task title */}
            <div>
              <h3 className={cn(
                'text-xl font-semibold text-gray-900',
                task.isCompleted && 'line-through text-gray-500'
              )}>
                {task.title}
              </h3>
              {task.isCompleted && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                  <Check className="h-3 w-3 mr-1" />
                  Completed
                </span>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {task.description}
                </p>
              </div>
            )}

            {/* Course */}
            {task.course && (
              <div className="flex items-center text-sm text-gray-600">
                <BookOpen className="h-4 w-4 mr-2" />
                <span className="font-medium">Course:</span>
                <span className="ml-2">{task.course}</span>
              </div>
            )}

            {/* Due date */}
            <div className={cn('flex items-center text-sm', urgencyColor)}>
              <Calendar className="h-4 w-4 mr-2" />
              <div>
                <span className="font-medium">{getDueDateText()}</span>
                <div className="text-gray-500 mt-1">
                  {formatDate(task.dueDate)} at {formatTime(task.dueDate)}
                </div>
              </div>
            </div>

            {/* Syllabus extraction indicator */}
            {task.extractedFromSyllabus && (
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                <FileText className="h-4 w-4 mr-2" />
                <span>This task was automatically extracted from a syllabus</span>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-gray-500 space-y-1 pt-4 border-t border-gray-100">
              <div>Created: {formatDate(task.createdAt)}</div>
              {task.updatedAt.getTime() !== task.createdAt.getTime() && (
                <div>Updated: {formatDate(task.updatedAt)}</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={handleRemove}
              className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </button>
            {!task.isCompleted && (
              <button
                onClick={handleComplete}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}