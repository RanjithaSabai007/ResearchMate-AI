import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Key, User, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../utils/api';

export default function Signup() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
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
      // POST payload will be automatically encrypted by api.js Axios request interceptor!
      await api.post('/api/auth/register', formData);
      // After signup, redirect to login page
      navigate('/login');
    } catch (err) {
      console.log('Signup component caught error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Registration failed. Please check details.');
      } else {
        setError('Network error. Is the backend server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-pastel-pink/30 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pastel-green/30 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl p-8 hover:shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-pastel-pink to-pastel-highlight text-pastel-accent mb-3">
            <BookOpen className="w-8 h-8 text-pastel-accent" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
          <p className="text-gray-400 text-sm mt-1.5 font-medium">Join ResearchMate AI to secure your thesis files</p>
        </div>

        {/* Errors */}
        {error && (
          <div className="mb-6 flex items-start space-x-3 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-pulse">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
              <input
                required
                type="text"
                name="username"
                placeholder="enter username"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-pastel-pink/50 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
              <input
                required
                type="email"
                name="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-pastel-pink/50 focus:bg-white transition-all font-medium"
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
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-pastel-pink/50 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-pastel-accent hover:bg-pastel-accent/90 disabled:bg-pastel-accent/50 text-white font-bold rounded-2xl transition-all shadow-md shadow-pastel-pink/20 flex items-center justify-center space-x-2 hover-scale mt-8"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Register Account</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-8 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-pastel-accent font-bold hover:underline">
            Sign In
          </Link>
        </p>

      </div>
    </div>
  );
}
