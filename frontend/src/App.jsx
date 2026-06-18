import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

// Route protector for authenticated page (Dashboard)
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('session_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Route protector for login/signup if already logged in
function PublicRoute({ children }) {
  const token = localStorage.getItem('session_token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
