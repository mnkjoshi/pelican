'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, RefreshCw, Settings, Plus } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  color?: string;
}

interface GoogleCalendarProps {
  apiKey?: string;
  calendarId?: string;
}

export function GoogleCalendar({ apiKey, calendarId = 'primary' }: GoogleCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mock data for demonstration since we don't have actual Google Calendar setup
  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'CS 485 Lecture',
      start: new Date('2025-10-08T10:00:00'),
      end: new Date('2025-10-08T11:30:00'),
      description: 'Machine Learning Fundamentals',
      location: 'Engineering Building, Room 201',
      color: '#4285f4'
    },
    {
      id: '2',
      title: 'Math 240 Assignment Due',
      start: new Date('2025-10-09T11:30:00'),
      end: new Date('2025-10-09T11:30:00'),
      description: 'Linear Algebra Problem Set 8',
      color: '#ea4335'
    },
    {
      id: '3',
      title: 'Study Group - Database Systems',
      start: new Date('2025-10-10T18:00:00'),
      end: new Date('2025-10-10T20:00:00'),
      location: 'Library, Study Room 3B',
      color: '#34a853'
    },
    {
      id: '4',
      title: 'Career Fair',
      start: new Date('2025-10-16T10:00:00'),
      end: new Date('2025-10-16T16:00:00'),
      location: 'Student Union Ballroom',
      description: 'Annual career fair with 50+ companies',
      color: '#fbbc04'
    }
  ];

  useEffect(() => {
    // Simulate loading calendar events
    setIsLoading(true);
    setTimeout(() => {
      setEvents(mockEvents);
      setIsConnected(true);
      setIsLoading(false);
    }, 1000);
  }, []);

  const connectToGoogleCalendar = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would handle Google OAuth
      // For demo purposes, we'll just simulate connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsConnected(true);
      setEvents(mockEvents);
    } catch (err) {
      setError('Failed to connect to Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshEvents = async () => {
    setIsLoading(true);
    try {
      // Simulate refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEvents(mockEvents);
    } catch (err) {
      setError('Failed to refresh events');
    } finally {
      setIsLoading(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return events.filter(event => event.start.toDateString() === dateStr);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <CalendarIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Connect to Google Calendar
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
            Sync your academic schedule and deadlines with Google Calendar for seamless organization.
          </p>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          <button
            onClick={connectToGoogleCalendar}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CalendarIcon className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              →
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshEvents}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Settings className="h-4 w-4" />
          </button>
          <button className="flex items-center px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">
            <Plus className="h-3 w-3 mr-1" />
            Add Event
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {getDaysInMonth(currentDate).map((date, index) => {
            if (!date) {
              return <div key={index} className="h-24 p-1"></div>;
            }

            const dayEvents = getEventsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();

            return (
              <div
                key={date.toISOString()}
                className={`h-24 p-1 border border-gray-100 dark:border-gray-700 rounded ${
                  isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : isCurrentMonth 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded text-white truncate"
                      style={{ backgroundColor: event.color }}
                      title={`${event.title} - ${formatTime(event.start)}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events Sidebar */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Upcoming Events</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {events
            .filter(event => event.start >= new Date())
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .slice(0, 5)
            .map(event => (
              <div key={event.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                <div
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {event.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {event.start.toLocaleDateString()} at {formatTime(event.start)}
                  </p>
                  {event.location && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      📍 {event.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}