'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components';
import { GoogleCalendar } from '@/components/google-calendar';
import { AddItemModal } from '@/components/add-item-modal';
import { Plus } from 'lucide-react';
import type { Event } from '@/lib/types';
import { generateId } from '@/lib/search-utils';

export default function CalendarPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);

  const handleAddEvent = () => {
    setIsAddModalOpen(true);
  };

  const handleAddEventSubmit = (eventData: {
    title: string;
    description: string;
    date: Date;
    location?: string;
    type: Event['type'];
  }) => {
    const newEvent: Event = {
      id: generateId(),
      ...eventData,
      userId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const handleAddTask = (taskData: {
    title: string;
    description: string;
    dueDate: Date;
    course?: string;
  }) => {
    // Tasks added from calendar will be treated as deadline events
    const newEvent: Event = {
      id: generateId(),
      title: taskData.title,
      description: taskData.description,
      date: taskData.dueDate,
      location: taskData.course,
      type: 'academic',
      userId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEvents(prev => [...prev, newEvent]);
  };

  return (
    <DashboardLayout
      title="Calendar"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search calendar events..."
    >
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View all your deadlines and events in calendar format
            </p>
          </div>
          <button 
            onClick={handleAddEvent}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </button>
        </div>

        {/* Google Calendar Integration */}
        <GoogleCalendar />
      </div>

      {/* Add Event Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTask={handleAddTask}
        onAddEvent={handleAddEventSubmit}
        mode="event"
      />
    </DashboardLayout>
  );
}