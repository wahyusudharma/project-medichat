import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from '../assets/images/logo.jpg';
import '../Styles.css';

const Header = ({ authStatus }) => {
  const navigate = useNavigate();
  
  // State Modal & Logout
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // State Mode Edit
  const [editMode, setEditMode] = useState('none'); // 'none', 'name', 'password'
  const [tempName, setTempName] = useState('');
  const [passData, setPassData] = useState({ newPass: '', confirmPass: '' });
  const [isLoading, setIsLoading] = useState(false);
  
  const safeAuth = authStatus || {};
  const isLoggedIn = safeAuth.isLoggedIn || false;
  const user = safeAuth.user || { name: 'Pengguna', role: 'user' };
  
  // Gunakan email asli jika ada, jika tidak kosong
  const userEmail = localStorage.getItem('user_email') || "";

  const openModal = () => {
    setTempName(user.name); 
    setEditMode('none');
    setPassData({ newPass: '', confirmPass: '' });
    setShowProfileModal(true);
  };

  const onLogoutClick = () => {
      setShowProfileModal(false);
      setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user_fullname');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_email');
      setShowLogoutConfirm(false);
      window.location.href = '/'; 
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const handleMainNavigation = () => {
    if (!isLoggedIn) {
      navigate('/login');
    } else if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/diagnosis');
    }
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    let payload = {};

    if (editMode === 'name') {
        if (!tempName.trim()) { alert("Nama tidak boleh kosong"); setIsLoading(false); return; }
        payload = { full_name: tempName };
    } else if (editMode === 'password') {
        if (passData.newPass.length < 6) { alert("Password minimal 6 karakter"); setIsLoading(false); return; }
        if (passData.newPass !== passData.confirmPass) { alert("Konfirmasi password tidak cocok"); setIsLoading(false); return; }
        payload = { new_password: passData.newPass };
    }

    try {
        const response = await fetch('/api/users/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Berhasil diperbarui! Silakan login ulang untuk melihat perubahan.");
            confirmLogout();
        } else {
            alert("Gagal memperbarui profil.");
        }
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan koneksi.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo-container" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
               <img src={logoImage} alt="MediChat Logo" className="header-logo" style={{ width: '180px', height: 'auto' }} />
            </div>

            <div className="nav-right">
              <div className="nav-link" onClick={() => navigate('/')} style={{cursor:'pointer'}}>Home</div>
              
              <div className="nav-link" onClick={handleMainNavigation} style={{cursor:'pointer', marginRight:'10px'}}>
                {isLoggedIn && user.role === 'admin' ? "Dashboard Admin" : "Diagnosa"}
              </div>
              
              {isLoggedIn ? (
                <button className="profile-btn" onClick={openModal}>
                  <div className="avatar-circle">{getInitials(user.name)}</div>
                  {user.name.split(' ')[0]}
                </button>
              ) : (
                <button onClick={() => navigate('/login')} className="primary-btn nav-diagnosa">Masuk</button>
              )}
            </div> 
          </div>
        </div>
      </header>

      {/* --- MODAL PROFIL (DESAIN FINAL) --- */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-profile-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn-absolute" onClick={() => setShowProfileModal(false)}>×</button>

            <div className="profile-layout">
                {/* KIRI: Avatar */}
                <div className="profile-left">
                    <div className="avatar-large-placeholder">
                        <span style={{opacity:0.3, fontSize:'3rem'}}>📷</span>
                    </div>
                </div>

                {/* KANAN: Form & Actions */}
                <div className="profile-right">
                    
                    {/* Nama Lengkap */}
                    <div className="profile-input-group">
                        <label className="input-label-sm">Nama Lengkap</label>
                        <input 
                            type="text" 
                            value={editMode === 'name' ? tempName : user.name} 
                            readOnly={editMode !== 'name'}
                            onChange={(e) => setTempName(e.target.value)}
                            className={`profile-input ${editMode === 'name' ? 'editable' : ''}`} 
                        />
                        {/* Ikon Pensil untuk Edit Nama */}
                        {editMode === 'none' && (
                            <span className="edit-icon" onClick={() => setEditMode('name')} title="Edit Nama">✏️</span>
                        )}
                    </div>

                    {/* Email */}
                    <div className="profile-input-group">
                         <label className="input-label-sm">Email</label>
                        <input type="text" value={userEmail} readOnly className="profile-input bg-gray" />
                    </div>

                    {/* Area Password (Tampil jika mode password) */}
                    {editMode === 'password' && (
                        <>
                            <div className="profile-input-group" style={{marginTop:'10px'}}>
                                <input 
                                    type="password" 
                                    placeholder="Password Baru" 
                                    className="profile-input" 
                                    value={passData.newPass}
                                    onChange={(e) => setPassData({...passData, newPass: e.target.value})}
                                />
                            </div>
                            <div className="profile-input-group" style={{marginTop:'10px'}}>
                                <input 
                                    type="password" 
                                    placeholder="Konfirmasi Password" 
                                    className="profile-input" 
                                    value={passData.confirmPass}
                                    onChange={(e) => setPassData({...passData, confirmPass: e.target.value})}
                                />
                            </div>
                        </>
                    )}

                    {/* Tombol Aksi */}
                    <div className="profile-actions-row">
                        {editMode === 'none' ? (
                            <button className="btn-outline-small" onClick={() => setEditMode('password')}>
                                Ganti Password
                            </button>
                        ) : (
                            <>
                                {/* Simpan Perubahan: Warna Biru Tema */}
                                <button className="primary-btn" style={{fontSize:'0.9rem', padding:'8px 15px'}} onClick={handleSaveChanges} disabled={isLoading}>
                                    {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                                <button className="btn-cancel-gray" onClick={() => {setEditMode('none'); setTempName(user.name);}} disabled={isLoading}>
                                    Batal
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <hr className="profile-divider" />

            {/* Footer: Bahasa & Logout di Bawah Kanan */}
            <div className="profile-bottom-settings">
                <div className="setting-row">
                    <span className="setting-label bold-text">Bahasa</span>
                    <button className="btn-outline-box">Indonesia</button>
                </div>
                {/* Tombol Logout dipindah ke sini */}
                <div style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end'}}>
                     <button className="btn-logout-red" onClick={onLogoutClick}>
                        Keluar
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP LOGOUT --- */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
            <div className="logout-confirm-card" onClick={(e) => e.stopPropagation()}>
                <h3>Konfirmasi Keluar</h3>
                <p>Apakah Anda yakin ingin keluar dari sesi ini?</p>
                <div className="logout-actions">
                    <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>
                        Batal
                    </button>
                    <button className="btn-confirm-logout" onClick={confirmLogout}>
                        Ya, Keluar
                    </button>
                </div>
            </div>
        </div>
      )}

    </>
  );
};
export default Header;