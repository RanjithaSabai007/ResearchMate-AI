import React from 'react';
import { Laptop, Menu } from 'lucide-react';

export default function Topbar({ isDark, user, activeSection, onMenuClick }) {
  // Simple section headers
  const headers = {
    dashboard: 'Dashboard Overview',
    audit: 'Audit Trails & Active Sessions',
  };

  return (
    <header 
      className={`h-16 border-b flex items-center justify-between px-6 transition-colors duration-200 ${
        isDark 
          ? 'bg-pastel-darkCard border-pastel-darkBorder text-gray-200' 
          : 'bg-white border-gray-100 text-gray-800'
      }`}
    >
      {/* Page Title & Hamburger Menu for mobile */}
      <div className="flex items-center space-x-3.5">
        <button
          onClick={onMenuClick}
          className={`p-2 rounded-xl border hover-scale lg:hidden ${
            isDark 
              ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-400' 
              : 'border-gray-100 hover:bg-gray-50 text-gray-600'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">
          {headers[activeSection] || 'Overview'}
        </h1>
      </div>

      {/* Connection & Security indicators */}
      <div className="flex items-center space-x-4">
        <div className="text-sm font-medium text-gray-400 flex items-center space-x-1">
          <Laptop className="w-4 h-4" />
          <span>ResearchMate v1.0</span>
        </div>
      </div>
    </header>
  );
}

