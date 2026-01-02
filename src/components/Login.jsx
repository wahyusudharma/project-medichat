import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../Styles/auth.css';
import logo from '../assets/images/logo.jpg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const response = await fetch('/api/token', { method: 'POST', body: formData });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user_fullname', data.full_name);
        localStorage.setItem('user_role', data.role);
        localStorage.setItem('user_email', data.email || ""); // Simpan email
        
        if (data.role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/diagnosis';
        }
      } else {
        setError(data.detail || 'Username atau password salah');
      }
    } catch (err) {
      setError('Gagal terhubung ke server. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="MediCare Logo" className="auth-logo" />
          <h2>Selamat Datang Kembali</h2>
          <p>Masuk untuk konsultasi kesehatan Anda</p>
        </div>
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input type="text" placeholder="Masukkan username Anda" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Masukkan password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
          <button type="submit" className="auth-btn" disabled={loading}>{loading ? 'Memproses...' : 'Masuk'}</button>
        </form>
        <div className="auth-footer">
          <p>Belum punya akun? <Link to="/register">Daftar sekarang</Link></p>
        </div>
      </div>
    </div>
  );
};
export default Login;