import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { Plus, LogOut, Code, Users, Trash2 } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/room/list/${user._id}`, {
          headers: { token: user.token }
        });
        setRooms(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) fetchRooms();
  }, [user]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return alert('Please enter a room name');
    try {
      const res = await axios.post(`${API_URL}/api/room/create`, {
        roomName: newRoomName,
        userId: user._id
      }, {
        headers: { token: user.token }
      });
      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) return alert('Please enter a valid room ID');
    try {
      await axios.post(`${API_URL}/api/room/join`, {
        roomId: joinRoomId,
        userId: user._id
      }, {
        headers: { token: user.token }
      });
      navigate(`/room/${joinRoomId}`);
    } catch (err) {
      alert('Failed to join room. Verify the Room ID.');
    }
  };

  const handleDeleteRoom = async (e, room) => {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(`Delete workspace "${room.roomName || 'Untitled Room'}"? This cannot be undone.`);
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/api/room/${room.roomId}`, {
        params: { userId: user._id },
        headers: { token: user.token }
      });
      setRooms((prev) => prev.filter((r) => r.roomId !== room.roomId));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const handleDeleteAccount = async () => {
    const ok = window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.");
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/api/auth/delete-account`, {
        headers: { token: user.token }
      });
      alert("Account successfully deleted.");
      logout();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete account");
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2><Code className="icon" /> CodeSphere</h2>
        <div className="nav-profile">
          <span>{user.name}</span>
          <button onClick={logout} className="logout-btn" title="Log Out"><LogOut size={18} /></button>
          <button onClick={handleDeleteAccount} className="delete-account-btn" title="Delete Account"><Trash2 size={18} /></button>
        </div>
      </nav>

      <div className="dashboard-content">
        <header className="dashboard-header">
          <div className="dashboard-header-top">
            <div>
              <h1>Welcome, {user.name.split(' ')[0]}</h1>
              <p>Collaborate in real-time. Create a new workspace or join an existing one.</p>
            </div>
            {user.role === 'admin' && (
              <button className="admin-panel-btn" onClick={() => navigate('/admin')}>
                Admin Dashboard
              </button>
            )}
          </div>
        </header>

        <div className="dashboard-actions">
          <div className="action-card create-card">
            <h3>Create a Workspace</h3>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Name your project..." 
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              <button onClick={handleCreateRoom} className="btn-primary"><Plus size={18} /> New Room</button>
            </div>
          </div>

          <div className="action-card join-card">
            <h3>Join a Workspace</h3>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Paste Room ID here..." 
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
              />
              <button onClick={handleJoinRoom} className="btn-secondary"><Users size={18} /> Join Room</button>
            </div>
          </div>
        </div>

        <div className="recent-rooms">
          <h3>Your Recent Workspaces</h3>
          <div className="rooms-grid">
            {rooms.length === 0 ? (
              <p className="no-rooms">You haven't participated in any rooms yet.</p>
            ) : (
              rooms.map(room => (
                <div key={room.roomId} className="room-item" onClick={() => navigate(`/room/${room.roomId}`)}>
                  <button
                    type="button"
                    className="room-delete-btn"
                    title={String(room.createdBy) === String(user._id) ? "Delete workspace" : "Only the creator can delete"}
                    onClick={(e) => handleDeleteRoom(e, room)}
                    disabled={String(room.createdBy) !== String(user._id)}
                  >
                    <Trash2 size={16} />
                  </button>
                  <h4>{room.roomName || 'Untitled Room'}</h4>
                  <span className="room-id">ID: {room.roomId.substring(0, 8)}...</span>
                  <div className="room-meta">
                    <Users size={14}/> {room.participants.length} Participant(s)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
