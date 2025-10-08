'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InfoCardProps } from '@/lib/types';

export function InfoCard({ 
  title, 
  children, 
  onAdd, 
  className 
}: InfoCardProps) {
  return (
    <div 
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white lowercase">
          {title}
        </h2>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center w-8 h-8 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full transition-colors duration-200"
            aria-label={`Add new ${title}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}