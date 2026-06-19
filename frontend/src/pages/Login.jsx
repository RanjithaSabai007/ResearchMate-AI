import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Key, User, Shield, AlertCircle, FileText, CheckCircle, Database, ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/Logo.PNG';

export default function Login() {
  const [formData, setFormData] = useState({ username_or_email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login', formData);
      const { session_token, user } = response.data;
      localStorage.setItem('session_token', session_token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      console.log('Login component caught error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Login failed. Please check your credentials.');
      } else {
        setError('Network error. Is the backend server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-stretch overflow-hidden">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
      `}</style>

      {/* Left Info Panel (Split screen, visible on lg and up) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-slate-900 via-indigo-950 to-purple-950 p-16 text-white flex-col justify-between relative overflow-hidden">
        {/* Background decorative glowing circles */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-pastel-pink/10 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -z-10"></div>

        {/* Top Header Logo */}
        <div className="flex items-center space-x-3 animate-fade-in-up">
          <img src={logo} alt="ResearchMate AI Logo" className="w-10 h-10 object-contain" />
          <span className="font-bold text-xl bg-gradient-to-r from-pastel-accent to-pink-400 bg-clip-text text-transparent">
            ResearchMate AI
          </span>
        </div>

        {/* Middle Feature Guide */}
        <div className="space-y-8 my-auto">
          <div className="space-y-4 animate-fade-in-up delay-100">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Organize, Secure, and Optimize Your{' '}
              <span className="bg-gradient-to-r from-pastel-pink to-indigo-300 bg-clip-text text-transparent">
                Research Assets
              </span>
            </h1>
            <p className="text-gray-300 text-md leading-relaxed max-w-lg font-medium">
              ResearchMate AI is a premium hub designed specifically for graduate students, academic scholars, and research labs. Securely catalog your library, organize PDF papers, manage metadata, and manage active DB connections.
            </p>
          </div>

          <div className="space-y-5 animate-fade-in-up delay-200">
            {/* Feature 1 */}
            <div className="flex items-start space-x-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 mt-1">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 text-sm">Centralized Bibliography</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">Manage paper titles, authors, domains, and keywords in one clean dashboard.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start space-x-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/20 text-emerald-300 mt-1">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 text-sm">Targeted Security Layer</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">Your passwords and sensitive user details are encrypted at rest with column-level storage.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start space-x-4">
              <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-400/20 text-purple-300 mt-1">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 text-sm">Real-time Auditing</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">Track user log mutations, revoke active sessions, and review a detailed security audit log.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500 animate-fade-in-up delay-300">
          &copy; {new Date().getFullYear()} ResearchMate AI. All rights reserved.
        </div>
      </div>

      {/* Right Form Panel (Full screen on mobile, 1/2 screen on lg) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 relative">
        {/* Background blurs (only visible/useful for contrast on right) */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-pastel-pink/20 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pastel-green/20 rounded-full blur-3xl -z-10"></div>

        <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl p-8 hover:shadow-2xl transition-all duration-300 animate-fade-in-up delay-100">
          
          {/* Header Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="p-1 mb-3">
              <img src={logo} alt="ResearchMate AI Logo" className="w-14 h-14 object-contain" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Welcome Back</h2>
            <p className="text-gray-400 text-sm mt-1.5 font-medium text-center">Log in to secure ResearchMate AI space</p>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="mb-6 flex items-start space-x-3 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-pulse">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Username or Email</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                <input
                  required
                  type="text"
                  name="username_or_email"
                  placeholder="enter username or email"
                  value={formData.username_or_email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-pastel-pink/50 focus:bg-white transition-all font-semibold text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                <input
                  required
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-pastel-pink/50 focus:bg-white transition-all font-semibold text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-pastel-accent hover:bg-pastel-accent/90 disabled:bg-pastel-accent/50 text-white font-bold rounded-2xl transition-all shadow-md shadow-pastel-pink/20 flex items-center justify-center space-x-2 hover-scale mt-8 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Secure Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-8 font-semibold">
            Don't have an account?{' '}
            <Link to="/signup" className="text-pastel-accent font-extrabold hover:underline">
              Create account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
