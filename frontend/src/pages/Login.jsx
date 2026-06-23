import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Key, User, Shield, AlertCircle, FileText, Database, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/Logo.PNG';

export default function Login() {
  const [formData, setFormData] = useState({ username_or_email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    const urlError = params.get('error');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('session_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/dashboard');
      } catch (err) {
        console.error('Failed to parse user from query params:', err);
        setError('Failed to authenticate via SSO.');
      }
    } else if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSocialLogin = (provider) => {
    setError(null);
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    window.location.href = `${apiBaseUrl}/api/auth/${provider}/login`;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptTerms) {
      setError("You must accept the terms and conditions to log in.");
      return;
    }
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

          {/* Social Sign-in Buttons at the Top */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center space-x-2 py-3 bg-white border border-gray-100 hover:border-gray-200 rounded-2xl text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 hover-scale"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 15.02 1 12 1 7.24 1 3.21 3.73 1.25 7.72l3.87 3C6.04 7.6 8.79 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.45 12.27c0-.82-.07-1.6-.2-2.36H12v4.51h6.43c-.28 1.47-1.11 2.71-2.36 3.55l3.67 2.84c2.14-1.97 3.36-4.88 3.36-8.54z" />
                <path fill="#FBBC05" d="M5.12 10.72A7.17 7.17 0 0 1 5 12c0 .44.05.88.12 1.3l-3.87 3A11.96 11.96 0 0 1 1 12c0-1.82.4-3.55 1.13-5.12l3.99 3.84z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.67-2.84c-1.02.68-2.33 1.09-3.96 1.09-3.21 0-5.96-2.56-6.93-5.68l-3.99 3.09C3.21 20.27 7.24 23 12 23z" />
              </svg>
              <span>Google</span>
            </button>
            
            <button
              type="button"
              onClick={() => handleSocialLogin('microsoft')}
              className="flex items-center justify-center space-x-2 py-3 bg-white border border-gray-100 hover:border-gray-200 rounded-2xl text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 hover-scale"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 23 23">
                <path fill="#f35325" d="M0 0h11v11H0z" />
                <path fill="#80bb0a" d="M12 0h11v11H12z" />
                <path fill="#00a1f1" d="M0 12h11v11H0z" />
                <path fill="#ffb900" d="M12 12h11v11H12z" />
              </svg>
              <span>Microsoft</span>
            </button>
            
            <button
              type="button"
              onClick={() => handleSocialLogin('linkedin')}
              className="flex items-center justify-center space-x-2 py-3 bg-white border border-gray-100 hover:border-gray-200 rounded-2xl text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 hover-scale"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>
              </svg>
              <span>LinkedIn</span>
            </button>
            
            <button
              type="button"
              onClick={() => handleSocialLogin('github')}
              className="flex items-center justify-center space-x-2 py-3 bg-white border border-gray-100 hover:border-gray-200 rounded-2xl text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 hover-scale"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          {/* Social Divider */}
          <div className="relative mb-6 flex items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Or continue with username/password</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

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

            {/* Remember Me Checkbox & Forgot Password Link */}
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
              
              <Link to="/forgot-password" className="text-xs font-bold text-pastel-accent hover:underline">
                Forgot Password?
              </Link>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-center">
              <label className="flex items-center space-x-2.5 text-xs text-gray-500 font-semibold cursor-pointer">
                <input
                  required
                  type="checkbox"
                  name="accept_terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-pastel-accent focus:ring-pastel-pink/50 cursor-pointer"
                />
                <span>
                  I accept the{' '}
                  <Link to="/terms" className="text-pastel-accent font-extrabold hover:underline">
                    terms and conditions
                  </Link>
                </span>
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



