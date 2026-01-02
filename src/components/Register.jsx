import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Styles/auth.css';
import logo from '../assets/images/logo.jpg';

const Register = () => {
  const [formData, setFormData] = useState({ 
    username: '', 
    full_name: '', 
    password: '', 
    confirmPassword: '',
    email: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak sama!');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          email: formData.email
        }),
      });
      const data = await response.json();
      if (response.ok) {
        navigate('/login');
      } else {
        setError(data.detail || 'Registrasi gagal. Username mungkin sudah dipakai.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="MediCare Logo" className="auth-logo" />
          <h2>Buat Akun Baru</h2>
          <p>Daftar untuk mulai konsultasi</p>
        </div>
        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label>Nama Lengkap</label>
            <input type="text" name="full_name" placeholder="Nama Lengkap Anda" value={formData.full_name} onChange={handleChange} required />
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" placeholder="contoh@email.com" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input type="text" name="username" placeholder="Buat username unik" value={formData.username} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="Minimal 6 karakter" value={formData.password} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Konfirmasi Password</label>
            <input type="password" name="confirmPassword" placeholder="Ulangi password" value={formData.confirmPassword} onChange={handleChange} required />
          </div>
          {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
          <button type="submit" className="auth-btn" disabled={loading}>{loading ? 'Mendaftar...' : 'Daftar'}</button>
        </form>
        <div className="auth-footer">
          <p>Sudah punya akun? <Link to="/login">Masuk disini</Link></p>
        </div>
      </div>
    </div>
  );
};
export default Register;