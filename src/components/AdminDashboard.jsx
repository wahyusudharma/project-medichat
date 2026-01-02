import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', password: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 403) {
        alert("Akses Ditolak! Anda bukan Admin.");
        navigate('/diagnosis');
        return;
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Yakin ingin menghapus user ${username}?`)) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/admin/users/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert("User berhasil dihapus");
        fetchUsers();
      } else {
        alert("Gagal menghapus user");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditClick = (user) => {
    setEditUser(user);
    setFormData({ full_name: user.full_name, password: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = { full_name: formData.full_name };
    if (formData.password) payload.password = formData.password;

    try {
      const response = await fetch(`/api/admin/users/${editUser.username}`, {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert("Data user diperbarui!");
        setEditUser(null);
        fetchUsers();
      } else {
        alert("Gagal update user");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px', minHeight: '80vh' }}>
      <h2 style={{ color: '#1e3c72', marginBottom: '20px', borderBottom: '2px solid #2a5298', paddingBottom: '10px' }}>
        Dashboard Admin 🛠️
      </h2>
      {loading ? (
        <p>Memuat data...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ backgroundColor: '#2a5298', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Username</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Nama Lengkap</th>
                <th style={{ padding: '12px' }}>Role</th>
                <th style={{ padding: '12px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.username} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{user.username}</td>
                  <td style={{ padding: '12px' }}>{user.email || "-"}</td>
                  <td style={{ padding: '12px' }}>{user.full_name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      backgroundColor: user.role === 'admin' ? '#e8f5e9' : '#e3f2fd',
                      color: user.role === 'admin' ? '#2e7d32' : '#1565c0',
                      padding: '4px 8px', borderRadius: '10px', fontSize: '0.85rem'
                    }}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {user.role !== 'admin' && (
                      <>
                        <button onClick={() => handleEditClick(user)} style={{ marginRight: '8px', padding: '5px 10px', backgroundColor: '#ffb74d', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}>Edit</button>
                        <button onClick={() => handleDelete(user.username)} style={{ padding: '5px 10px', backgroundColor: '#e57373', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}>Hapus</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{textAlign:'left'}}>
            <div className="modal-header">
              <h3>Edit User: {editUser.username}</h3>
              <button className="close-btn" onClick={() => setEditUser(null)}>×</button>
            </div>
            <form onSubmit={handleUpdate}>
                <div className="form-group">
                    <label>Nama Lengkap</label>
                    <input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
                </div>
                <div className="form-group">
                    <label>Password Baru (Opsional)</label>
                    <input type="password" placeholder="Isi jika ingin ganti password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>
                <button type="submit" className="primary-btn" style={{width: '100%', marginTop: '10px'}}>Simpan Perubahan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;