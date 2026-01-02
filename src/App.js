import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './Styles.css';
import './Styles/auth.css';

import Header from './components/header';
import Footer from './components/footer';
import Hero from './components/hero';
import Features from './components/Features';
import Privacy from './components/Privacy';
import DiagnosisPage from './components/DiagnosisPage';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';

// --- 1. PROTEKSI KHUSUS ADMIN ---
// Jika User biasa mencoba masuk, lempar ke /diagnosis
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("user_role");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/diagnosis" replace />;
  }

  return children;
};

// --- 2. PROTEKSI KHUSUS USER BIASA ---
// Jika Admin mencoba masuk, lempar ke /admin
const UserRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("user_role");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

// --- Halaman Home (Publik) ---
const HomePage = () => {
  const role = localStorage.getItem("user_role");
  
  // Logika tombol "Mulai" di Hero
  const navigateTo = (page) => {
    if (page === 'diagnosis') {
      if (role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/diagnosis';
      }
    }
  };
  return (
    <>
      <Hero navigateTo={navigateTo} />
      <Features />
      <Privacy />
    </>
  );
};

const App = () => {
  const token = localStorage.getItem("token");
  const userFullname = localStorage.getItem("user_fullname") || "Pengguna";
  const userRole = localStorage.getItem("user_role") || "user"; 

  const authStatusData = {
    isLoggedIn: !!token,
    user: {
      name: userFullname,
      role: userRole
    }
  };

  return (
    <Router>
      <Header authStatus={authStatusData} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Halaman Chat: HANYA USER BIASA */}
        <Route 
          path="/diagnosis" 
          element={
            <UserRoute>
              <DiagnosisPage />
            </UserRoute>
          } 
        />
        
        {/* Halaman Admin: HANYA ADMIN */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
               <AdminDashboard />
            </AdminRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default App;