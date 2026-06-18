import React from 'react';
import { Shield, ShieldAlert, Database, Laptop } from 'lucide-react';

export default function Topbar({ isDark, user, activeSection }) {
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
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          {headers[activeSection] || 'Overview'}
        </h1>
      </div>

      {/* Connection & Security indicators */}
      <div className="flex items-center space-x-4">
        {/* Network payload encryption status */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
          isDark 
            ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-400' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <Shield className="w-3.5 h-3.5" />
          <span>Payload Encrypted</span>
        </div>

        {/* Database Encryption Status */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
          isDark 
            ? 'bg-indigo-950/20 border-indigo-800/50 text-indigo-400' 
            : 'bg-indigo-50 border-indigo-200 text-indigo-700'
        }`}>
          <Database className="w-3.5 h-3.5" />
          <span>DB Encryption (AES-256)</span>
        </div>

        <div className="text-sm font-medium text-gray-400 flex items-center space-x-1">
          <Laptop className="w-4 h-4" />
          <span>ResearchMate v1.0</span>
        </div>
      </div>
    </header>
  );
}
