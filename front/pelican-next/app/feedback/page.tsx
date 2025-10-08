'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components';
import { MessageSquare, Send, Star } from 'lucide-react';

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState('general');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement feedback submission
    console.log('Feedback submitted:', { feedback, rating, feedbackType });
    // Reset form
    setFeedback('');
    setRating(0);
    setFeedbackType('general');
    alert('Thank you for your feedback! We\'ll review it shortly.');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
          <p className="text-gray-600 mt-1">
            Help us improve Pelican by sharing your thoughts and suggestions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feedback Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Share Your Feedback
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Type
                </label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="general">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="ui">UI/UX Feedback</option>
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you rate your overall experience?
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 rounded ${
                        star <= rating
                          ? 'text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-400'
                      } transition-colors`}
                    >
                      <Star className="h-6 w-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={6}
                  placeholder="Tell us what you think about Pelican. What's working well? What could be improved?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Feedback
              </button>
            </form>
          </div>

          {/* Feedback Info */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Get in Touch
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Email Support</h4>
                  <p className="text-gray-600 text-sm">support@pelican.app</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Feature Requests</h4>
                  <p className="text-gray-600 text-sm">features@pelican.app</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Bug Reports</h4>
                  <p className="text-gray-600 text-sm">bugs@pelican.app</p>
                </div>
              </div>
            </div>

            {/* Recent Updates */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Updates
              </h3>
              <div className="space-y-3">
                <div className="border-l-4 border-orange-400 pl-4">
                  <h4 className="font-medium text-gray-900 text-sm">
                    Dashboard Improvements
                  </h4>
                  <p className="text-gray-600 text-xs">
                    Enhanced task management and better visual design
                  </p>
                  <p className="text-gray-400 text-xs mt-1">October 7, 2025</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h4 className="font-medium text-gray-900 text-sm">
                    Syllabus Extraction Beta
                  </h4>
                  <p className="text-gray-600 text-xs">
                    AI-powered syllabus parsing now in beta testing
                  </p>
                  <p className="text-gray-400 text-xs mt-1">October 1, 2025</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h4 className="font-medium text-gray-900 text-sm">
                    Mobile Responsive Design
                  </h4>
                  <p className="text-gray-600 text-xs">
                    Improved mobile experience across all devices
                  </p>
                  <p className="text-gray-400 text-xs mt-1">September 25, 2025</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}