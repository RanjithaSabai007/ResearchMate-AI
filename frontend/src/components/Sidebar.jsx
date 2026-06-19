import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  User, 
  LogOut, 
  Menu, 
  Moon, 
  Sun,
  ChevronLeft
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/Logo.PNG';

export default function Sidebar({ isDark, toggleTheme, user, onSectionChange, activeSection, mobileOpen, setMobileOpen }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error("Failed to revoke session on server logout:", err);
    } finally {
      localStorage.removeItem('session_token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const handleNavClick = (sectionId) => {
    onSectionChange(sectionId);
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'audit', label: 'Audit Logs & Sessions', icon: History },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`h-screen flex flex-col justify-between border-r transition-all duration-300 z-40
          fixed inset-y-0 left-0 lg:static
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'} 
          ${isDark 
            ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/90 border-pastel-darkBorder text-gray-200' 
            : 'bg-gradient-to-b from-white via-slate-50 to-indigo-50/20 border-gray-100 text-gray-700'
          }`}
      >
        {/* Top Header */}
        <div>
          <div className={`p-4 flex ${isCollapsed ? 'flex-col space-y-3 items-center' : 'items-center justify-between'} border-b ${isDark ? 'border-pastel-darkBorder' : 'border-gray-100'}`}>
            <div className="flex items-center space-x-3 overflow-hidden flex-shrink-0">
              <div className="p-1 flex-shrink-0">
                <img src={logo} alt="ResearchMate AI Logo" className="w-8 h-8 object-contain flex-shrink-0" />
              </div>
              {!isCollapsed && (
                <span className="font-bold text-lg bg-gradient-to-r from-pastel-accent to-pink-500 bg-clip-text text-transparent truncate">
                  ResearchMate AI
                </span>
              )}
            </div>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-lg border hover-scale hidden lg:block ${
                isDark ? 'border-pastel-darkBorder hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Navigation items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-xl transition-all duration-200 text-left hover-scale ${
                    isActive
                      ? (isDark 
                          ? 'bg-gradient-to-r from-pastel-pink/15 to-indigo-900/35 text-pastel-pink font-extrabold border-l-4 border-pastel-accent shadow-sm'
                          : 'bg-gradient-to-r from-pastel-pink/20 to-pastel-green/20 text-pastel-accent font-extrabold border-l-4 border-pastel-accent shadow-sm'
                        )
                      : isDark
                        ? 'hover:bg-gray-800/50 text-gray-400 hover:text-gray-200'
                        : 'hover:bg-gray-55 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-pastel-accent' : ''}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile and Settings */}
        <div className={`p-3 border-t space-y-3 ${isDark ? 'border-pastel-darkBorder' : 'border-gray-100'}`}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-xl transition-colors hover-scale ${
              isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
            }`}
          >
            {isDark ? (
              <>
                <Sun className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                {!isCollapsed && <span>Light Mode</span>}
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                {!isCollapsed && <span>Dark Mode</span>}
              </>
            )}
          </button>

          {/* User profile details */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-2 rounded-xl ${isDark ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pastel-pink to-pastel-green flex items-center justify-center font-bold text-pastel-accent flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden min-w-0">
                <p className="font-semibold text-sm truncate">{user?.username}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors hover-scale text-left`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-semibold">Log Out</span>}
          </button>
        </div>
      </div>
    </>
  );
}
