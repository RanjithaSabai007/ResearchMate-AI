import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Key, User, Shield, AlertCircle, FileText, Database, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/Logo.PNG';

export default function Login() {
  const [formData, setFormData] = useState({ username_or_email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
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
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
      } else {
        localStorage.removeItem('remember_me');
      }
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
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
      `}</style>

      {/* Left Info Panel (Split screen, visible on lg and up) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-16 text-white flex-col justify-between relative overflow-hidden">
        {/* Soft, premium decorative glowing ambient blobs */}
        <div className="absolute -top-10 -left-10 w-96 h-96 bg-pastel-pink/5 rounded-full blur-[140px] -z-10 animate-pulse"></div>
        <div className="absolute -bottom-10 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[140px] -z-10 animate-pulse"></div>

        {/* Top Header Logo */}
        <div className="flex items-center space-x-3.5 animate-fade-in-up">
          <img src={logo} alt="ResearchMate AI Logo" className="w-9 h-9 object-contain" />
          <span className="font-extrabold text-xl bg-gradient-to-r from-pastel-accent to-pink-400 bg-clip-text text-transparent tracking-tight">
            ResearchMateAI
          </span>
        </div>

        {/* Middle Feature Guide */}
        <div className="space-y-8 my-auto max-w-xl">
          <div className="space-y-4.5 animate-fade-in-up delay-100">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pastel-pink/10 border border-pastel-pink/20 text-pastel-pink text-xs font-bold animate-float">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Powered Research Copilot</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Centralize, Analyze, and{' '}
              <span className="bg-gradient-to-r from-pastel-pink to-indigo-300 bg-clip-text text-transparent">
                Accelerate Research
              </span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              ResearchMateAI is an intelligent research management and thesis assistance platform designed to help scholars organize and derive deep insights from academic papers. Keep your research library protected with column-level database security and real-time active session logs.
            </p>
          </div>

          <div className="space-y-4 animate-fade-in-up delay-200">
            {/* Feature 1 */}
            <div className="flex items-start space-x-3.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Personalized Research Library</h4>
                <p className="text-xs text-slate-400 mt-0.5">Catalog thesis files, abstracts, authors, domains, and keywords inside your workspace.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start space-x-3.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Intelligent Document Copilot (Future)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Contextual literature review evaluations, semantic summaries, novelty audits, and gap analyses.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start space-x-3.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Thesis & project Builder (Future)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Auto-generate research objectives, methodologies, chapter outlines, and bibliography citations.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-500 animate-fade-in-up delay-300 font-medium">
          &copy; {new Date().getFullYear()} ResearchMateAI &bull; Secure Academic Workspace.
        </div>
      </div>

      {/* Right Form Panel (Full screen on mobile, 1/2 screen on lg) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 relative">
        {/* Background decorative blurs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-pastel-pink/15 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pastel-green/15 rounded-full blur-3xl -z-10"></div>

        <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl p-8 hover:shadow-2xl transition-all duration-300 animate-fade-in-up delay-100">
          
          {/* Header Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="p-1.5 mb-2.5">
              <img src={logo} alt="ResearchMate AI Logo" className="w-16 h-16 object-contain" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Welcome Back</h2>
            <p className="text-gray-400 text-xs mt-1.5 font-semibold text-center">Log in to secure ResearchMateAI workspace</p>
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

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2.5 text-xs text-gray-500 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  name="remember_me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-pastel-accent focus:ring-pastel-pink/50 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-pastel-accent hover:bg-pastel-accent/90 disabled:bg-pastel-accent/50 text-white font-bold rounded-2xl transition-all shadow-md shadow-pastel-pink/20 flex items-center justify-center space-x-2 hover-scale mt-6 text-sm"
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
