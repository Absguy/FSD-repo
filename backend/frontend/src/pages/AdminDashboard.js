import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { Users, Trash2, LayoutDashboard, ArrowLeft } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersRes, roomsRes] = await Promise.all([
          axios.get(`${API_URL}/api/admin/users`, { headers: { token: user.token } }),
          axios.get(`${API_URL}/api/admin/rooms`, { headers: { token: user.token } })
        ]);
        setUsers(usersRes.data || []);
        setRooms(roomsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin' || user?.role === 'superadmin') fetchAdminData();
  }, [user]);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
        headers: { token: user.token }
      });
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete user');
    }
  };

  const canDeleteUser = (targetRole) => {
    if (user?.role === 'superadmin') return targetRole !== 'superadmin';
    if (user?.role === 'admin') return targetRole === 'user';
    return false;
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Delete this room? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/rooms/${roomId}`, {
        headers: { token: user.token }
      });
      setRooms(prev => prev.filter(r => r.roomId !== roomId));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete room');
    }
  };

  return (
    <div className="admin-dashboard-container">
      <nav className="admin-nav">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="admin-nav-title">
          <LayoutDashboard className="icon" />
          <div>
            <h2>Admin Dashboard</h2>
            <p>Monitor rooms, manage users, and remove resources as needed.</p>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </nav>

      <div className="admin-content">
        <div className="admin-summary">
          <div className="summary-card rooms-card">
            <h3>Active Rooms</h3>
            <span>{rooms.length}</span>
          </div>
          <div className="summary-card users-card">
            <h3>Registered Users</h3>
            <span>{users.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">Loading admin data...</div>
        ) : (
          <>
            <section className="admin-section">
              <div className="section-header">
                <h3><Users size={18} /> User Management</h3>
              </div>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((profile) => (
                      <tr key={profile._id}>
                        <td>{profile.name}</td>
                        <td>{profile.email}</td>
                        <td>{profile.role}</td>
                        <td>
                          {canDeleteUser(profile.role) ? (
                            <button className="delete-btn" onClick={() => handleDeleteUser(profile._id)}>
                              <Trash2 size={14} /> Delete
                            </button>
                          ) : (
                            <span className="protected-label">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-section">
              <div className="section-header">
                <h3><LayoutDashboard size={18} /> Room Monitoring</h3>
              </div>
              <div className="room-cards-grid">
                {rooms.map((room) => (
                  <div key={room.roomId} className="room-card">
                    <div className="room-card-info">
                      <h4>{room.roomName || 'Untitled Room'}</h4>
                      <span>ID: {room.roomId}</span>
                      <span>Creator: {room.createdBy}</span>
                      <span>{room.participants?.length || 0} participant(s)</span>
                    </div>
                    <button className="delete-btn" onClick={() => handleDeleteRoom(room.roomId)}>
                      <Trash2 size={14} /> Delete Room
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
