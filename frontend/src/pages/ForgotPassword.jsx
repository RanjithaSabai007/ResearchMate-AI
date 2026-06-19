import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ShieldCheck, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/Logo.PNG';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setDemoOtp('');

    try {
      // API call to request reset OTP
      const response = await api.post('/api/auth/forgot-password', { email });
      setSuccess(true);
      // Retrieve simulated OTP for demo convenience
      if (response.data && response.data.demo_otp) {
        setDemoOtp(response.data.demo_otp);
      }
    } catch (err) {
      console.error('Forgot Password component caught error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to request reset OTP. Check your email.');
      } else {
        setError('Network error. Is the backend server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 relative overflow-hidden">
      {styleTag()}

      {/* Decorative blurs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-pastel-pink/15 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pastel-green/15 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl p-8 hover:shadow-2xl transition-all duration-300 animate-fade-in-up">
        {/* Top Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-1.5 mb-2.5">
            <img src={logo} alt="ResearchMate AI Logo" className="w-16 h-16 object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Forgot Password</h2>
          <p className="text-gray-400 text-xs mt-1.5 font-semibold text-center">
            Recover your ResearchMateAI secure workspace account
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 flex items-start space-x-3 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-pulse">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Flow */}
        {success ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-pastel-green/20 border border-pastel-green/30 text-emerald-800 text-sm font-semibold space-y-3">
              <div className="flex justify-center">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <p>A password reset code has been generated successfully!</p>
              
              {demoOtp && (
                <div className="mt-3 p-3 bg-white/80 border border-pastel-green/40 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Demo Verification Code</p>
                  <p className="text-2xl font-extrabold font-mono tracking-widest text-pastel-accent mt-1">{demoOtp}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(demoOtp)}`)}
              className="w-full py-4 bg-pastel-accent hover:bg-pastel-accent/90 text-white font-bold rounded-2xl transition-all shadow-md shadow-pastel-pink/20 hover-scale text-sm flex items-center justify-center space-x-2"
            >
              <KeyRound className="w-5 h-5" />
              <span>Go to Password Reset</span>
            </button>
          </div>
        ) : (
          /* Input Request Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                <input
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-pastel-pink/50 focus:bg-white transition-all font-semibold text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-pastel-accent hover:bg-pastel-accent/90 disabled:bg-pastel-accent/50 text-white font-bold rounded-2xl transition-all shadow-md shadow-pastel-pink/20 flex items-center justify-center space-x-2 hover-scale mt-6 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Request Recovery Code</span>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link 
            to="/login" 
            className="inline-flex items-center space-x-2 text-xs font-extrabold text-pastel-accent hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function styleTag() {
  return (
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
      .animate-fade-in-up {
        animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .hover-scale {
        transition: transform 0.2s ease-out;
      }
      .hover-scale:hover {
        transform: scale(1.02);
      }
      .hover-scale:active {
        transform: scale(0.98);
      }
    `}</style>
  );
}
