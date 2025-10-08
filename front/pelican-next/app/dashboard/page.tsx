'use client';

import { useState } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { DashboardLayout, InfoCard, TaskItem, TaskDetailModal, AddItemModal } from '@/components';
import { mockTasks, mockEvents, getUpcomingTasks, getIncompleteTasks, getUpcomingEvents } from '@/lib/mock-data';
import { formatDate, formatTime } from '@/lib/utils';
import { searchTasks, searchEvents, generateId } from '@/lib/search-utils';
import type { Task, Event } from '@/lib/types';

export default function DashboardPage() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalMode, setAddModalMode] = useState<'task' | 'event'>('task');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState(mockTasks);
  const [events, setEvents] = useState(mockEvents);

  // Filter tasks and events based on search query
  const filteredTasks = searchTasks(tasks, searchQuery);
  const filteredEvents = searchEvents(events, searchQuery);

  const upcomingTasks = getUpcomingTasks(filteredTasks);
  const incompleteTasks = getIncompleteTasks(filteredTasks);
  const upcomingEvents = getUpcomingEvents(filteredEvents);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskComplete = (taskId: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, isCompleted: true, updatedAt: new Date() }
          : task
      )
    );
  };

  const handleTaskRemove = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  const handleAddDeadline = () => {
    setAddModalMode('task');
    setIsAddModalOpen(true);
  };

  const handleAddTodo = () => {
    setAddModalMode('task');
    setIsAddModalOpen(true);
  };

  const handleAddEventClick = () => {
    setAddModalMode('event');
    setIsAddModalOpen(true);
  };

  const handleAddTask = (taskData: {
    title: string;
    description: string;
    dueDate: Date;
    course?: string;
  }) => {
    const newTask: Task = {
      id: generateId(),
      ...taskData,
      isCompleted: false,
      extractedFromSyllabus: false,
      userId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleAddEvent = (eventData: {
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

  return (
    <DashboardLayout
      title="Dashboard"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search tasks and events..."
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome section */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            You have {incompleteTasks.length} pending tasks and {upcomingEvents.length} upcoming events. 
            Let's make the most of your university experience!
          </p>
        </div>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Upcoming Deadlines */}
          <InfoCard 
            title="upcoming deadlines" 
            onAdd={handleAddDeadline}
            className="xl:col-span-1"
          >
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No upcoming deadlines</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Click the + button to add your first deadline
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.slice(0, 5).map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onClick={handleTaskClick}
                  />
                ))}
                {upcomingTasks.length > 5 && (
                  <div className="text-center pt-2">
                    <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium">
                      View {upcomingTasks.length - 5} more deadlines
                    </button>
                  </div>
                )}
              </div>
            )}
          </InfoCard>

          {/* To-Do List */}
          <InfoCard 
            title="to-do" 
            onAdd={handleAddTodo}
            className="xl:col-span-1"
          >
            {incompleteTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="h-12 w-12 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-gray-600 dark:text-gray-300">✓</span>
                </div>
                <p className="text-sm">All caught up!</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  No pending tasks at the moment
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incompleteTasks.slice(0, 5).map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onClick={handleTaskClick}
                  />
                ))}
                {incompleteTasks.length > 5 && (
                  <div className="text-center pt-2">
                    <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium">
                      View {incompleteTasks.length - 5} more tasks
                    </button>
                  </div>
                )}
              </div>
            )}
          </InfoCard>

          {/* Upcoming Events */}
          <InfoCard 
            title="upcoming events" 
            onAdd={handleAddEventClick}
            className="xl:col-span-1"
          >
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No upcoming events</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Click the + button to add your first event
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.slice(0, 4).map((event) => (
                  <div 
                    key={event.id}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow cursor-pointer bg-white dark:bg-gray-700"
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {event.title}
                    </h4>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{formatDate(event.date)} at {formatTime(event.date)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        event.type === 'club' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                        event.type === 'workshop' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                        event.type === 'academic' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                ))}
                {upcomingEvents.length > 4 && (
                  <div className="text-center pt-2">
                    <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium">
                      View {upcomingEvents.length - 4} more events
                    </button>
                  </div>
                )}
              </div>
            )}
          </InfoCard>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{tasks.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-600 dark:bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tasks.filter(t => t.isCompleted).length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Events</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{mockEvents.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">%</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tasks.length > 0 
                    ? Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100)
                    : 0
                  }%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onComplete={handleTaskComplete}
        onRemove={handleTaskRemove}
      />

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTask={handleAddTask}
        onAddEvent={handleAddEvent}
        mode={addModalMode}
      />
    </DashboardLayout>
  );
}