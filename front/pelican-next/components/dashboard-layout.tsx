'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export function DashboardLayout({ 
  children, 
  title = "Dashboard",
  searchQuery = "",
  onSearchChange = () => {},
  searchPlaceholder = "Search tasks and events..."
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header
          title={title}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}