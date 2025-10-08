'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle, Calendar, BookOpen } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-gray-800">Pelican</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/login" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign In
            </Link>
            <Link 
              href="/register"
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo and Brand */}
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Pelican
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-gray-600 mb-4 font-medium">
            Make the most of your university experience
          </p>
          
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Organize your academic life with intelligent deadline tracking, 
            syllabus extraction, and seamless task management designed for students.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/dashboard"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
            >
              <span>View Dashboard</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/register"
              className="border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200"
            >
              Sign Up Free
            </Link>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center p-6 bg-white/50 rounded-lg backdrop-blur-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Deadlines</h3>
              <p className="text-gray-600 text-sm">
                Never miss a deadline with intelligent tracking and priority sorting
              </p>
            </div>

            <div className="text-center p-6 bg-white/50 rounded-lg backdrop-blur-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Syllabus Extraction</h3>
              <p className="text-gray-600 text-sm">
                Automatically extract deadlines and assignments from your syllabus PDFs
              </p>
            </div>

            <div className="text-center p-6 bg-white/50 rounded-lg backdrop-blur-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Management</h3>
              <p className="text-gray-600 text-sm">
                Organize your academic and personal tasks in one central dashboard
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 mt-20">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          <p>&copy; 2025 Pelican. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  );
}
