import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Database, Lock, ArrowRight } from 'lucide-react';
import logo from '../assets/Logo.PNG';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Navbar */}
      <header className="max-w-7xl mx-auto w-full px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-1">
            <img src={logo} alt="ResearchMate AI Logo" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-pastel-accent to-pink-500 bg-clip-text text-transparent">
            ResearchMate AI
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/signup')}
            className="px-5 py-2.5 text-sm font-bold text-white bg-pastel-accent rounded-xl hover:bg-pastel-accent/90 transition-colors shadow-sm hover-scale"
          >
            Register
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 flex-grow flex flex-col items-center justify-center text-center">
        {/* Decorative Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-pastel-green/40 text-emerald-800 text-xs font-bold mb-6 border border-emerald-200">
          <Shield className="w-3.5 h-3.5" />
          <span>Complete Network & DB Layer Payload Encryption</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight max-w-4xl tracking-tight">
          Centralize, Analyze, and{' '}
          <span className="bg-gradient-to-r from-pastel-accent to-pink-500 bg-clip-text text-transparent">
            Secure Your Research
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-gray-500 text-lg md:text-xl mt-6 max-w-2xl font-medium">
          Upload PDF research papers, manage academic metadata, and review audit trails. Securely encrypted from frontend payloads directly into database records.
        </p>

        {/* Hero Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => navigate('/signup')}
            className="w-full sm:w-auto px-8 py-4 bg-pastel-accent hover:bg-pastel-accent/90 text-white font-bold rounded-2xl transition-all shadow-md shadow-pastel-pink/30 flex items-center justify-center space-x-2 hover-scale"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-2xl transition-all hover-scale"
          >
            Explore Platform
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 w-full text-left">
          {/* Card 1 */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-pastel-pink/20">
            <div className="w-12 h-12 rounded-2xl bg-pastel-pink/20 text-pastel-accent flex items-center justify-center mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Payload Network Encryption</h3>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              All requests and responses are encrypted using AES-256 before leaving the browser. If someone opens Chrome DevTools (Inspect), they will only see encrypted ciphertext.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-pastel-green/20">
            <div className="w-12 h-12 rounded-2xl bg-pastel-green/20 text-pastel-accent flex items-center justify-center mb-6">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Column-Level DB Encryption</h3>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              Data is encrypted in the PostgreSQL database automatically using custom SQLAlchemy decorators. Securely protects user metadata and sensitive fields at rest.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-pastel-pink/20">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pastel-accent flex items-center justify-center mb-6">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Sessions & Audit Trails</h3>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              Track database active sessions, browser user agents, IP addresses, and log mutations. Manage active sessions and view audit trails from your dashboard.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 py-6 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} ResearchMate AI. Designed with Premium Security.</p>
      </footer>
    </div>
  );
}
