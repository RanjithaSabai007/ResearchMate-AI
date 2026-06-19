import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { KeyRound, ShieldAlert, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/Logo.PNG';

export default function ResetPassword() {
  const [formData, setFormData] = useState({ email: '', otp: '', new_password: '' });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Parse query params to auto-fill email and OTP if passed
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email') || '';
    const otpParam = params.get('otp') || '';
    setFormData(prev => ({
      ...prev,
      email: emailParam,
      otp: otpParam
    }));
  }, [location]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/api/auth/reset-password', formData);
      setSuccess(true);
    } catch (err) {
      console.error('Reset Password caught error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to reset password. Check details.');
      } else {
        setError('Network error. Is the backend server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 relative overflow-hidden">
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

      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-pastel-pink/15 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pastel-green/15 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl p-8 hover:shadow-2xl transition-all duration-300 animate-fade-in-up">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-1.5 mb-2.5">
            <img src={logo} alt="ResearchMate AI Logo" className="w-16 h-16 object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Reset Password</h2>
          <p className="text-gray-400 text-xs mt-1.5 font-semibold text-center">Set your new password and reclaim secure entry</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 flex items-start space-x-3 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success State */}
        {success ? (
          <div className="space-y-6 text-center animate-fade-in-up">
            <div className="p-4 rounded-2xl bg-pastel-green/20 border border-pastel-green/30 text-emerald-800 text-sm font-semibold space-y-3">
              <div className="flex justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <p>Your password was updated successfully!</p>
              <p className="text-xs text-gray-400 font-medium">You can now proceed to log in using your new credentials.</p>
            </div>

            <Link
              to="/login"
              className="w-full py-4 bg-pastel-accent hover:bg-pastel-accent/90 text-white font-bold rounded-2xl transition-all shadow-md shadow-pastel-pink/20 hover-scale text-sm flex items-center justify-center space-x-2"
            >
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          /* Form Reset Password */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
              <input
                required
                type="email"
                name="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-pastel-pink/50 focus:bg-white transition-all font-semibold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">6-Digit Recovery Code</label>
              <input
                required
                type="text"
                name="otp"
                maxLength={6}
                placeholder="123456"
                value={formData.otp}
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-pastel-pink/50 focus:bg-white transition-all font-semibold text-sm font-mono tracking-widest text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">New Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                <input
                  required
                  type="password"
                  name="new_password"
                  placeholder="••••••••"
                  value={formData.new_password}
                  onChange={handleChange}
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
                <span>Update Password</span>
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
            <span>Cancel and Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
