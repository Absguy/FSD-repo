import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { LogIn, UserPlus, Users } from 'lucide-react';
import './AuthPage.css';

const AuthPage = () => {
  const [userType, setUserType] = useState('registered'); // registered | admin | guest
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', adminKey: '' });
  const [guestName, setGuestName] = useState('');
  const [guestRoomId, setGuestRoomId] = useState('');
  const [error, setError] = useState('');
  const { login, loginGuest } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (userType === 'guest') {
      if (!guestRoomId.trim()) {
        setError("Please enter a Room ID");
        return;
      }
      loginGuest(guestName);
      window.location.href = `/room/${guestRoomId.trim()}`;
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : {
          ...formData,
          role: userType === 'admin' ? 'admin' : 'user'
        };

    try {
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      if (isLogin) {
        if (userType === 'admin' && res.data?.user?.role !== 'admin') {
          setError("This account is not an admin.");
          return;
        }
        login(res.data.user, res.data.token);
      } else {
        setIsLogin(true); // Switch to login after register
        setFormData({ name: '', email: '', password: '', adminKey: '' });
        alert('Registered successfully! Please log in.');
      }
    } catch (err) {
      const respData = err.response?.data;
      let errMsg = 'An error occurred';
      if (typeof respData === 'string' && respData !== '') {
        errMsg = respData;
      } else if (respData && respData.message) {
        errMsg = respData.message;
      } else if (respData && respData.error) {
        errMsg = respData.error;
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-glass-panel">
        <div className="auth-header">
          <h2>
            {userType === 'guest'
              ? 'Join as Guest'
              : isLogin
              ? 'Welcome Back'
              : 'Join Us'}
          </h2>
          <p>
            {userType === 'guest'
              ? 'Enter a Room ID to join (read-only).'
              : isLogin
              ? 'Sign in to continue collaborating.'
              : 'Create an account to start coding together.'}
          </p>
        </div>

        {error && <div className="auth-error">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}

        <div className="auth-role-toggle">
          <button
            type="button"
            className={`auth-role-btn ${userType === 'registered' ? 'active' : ''}`}
            onClick={() => { setUserType('registered'); setIsLogin(true); setError(''); }}
          >
            Registered
          </button>
          <button
            type="button"
            className={`auth-role-btn ${userType === 'admin' ? 'active' : ''}`}
            onClick={() => { setUserType('admin'); setIsLogin(true); setError(''); }}
          >
            Admin
          </button>
          <button
            type="button"
            className={`auth-role-btn ${userType === 'guest' ? 'active' : ''}`}
            onClick={() => { setUserType('guest'); setError(''); }}
          >
            Guest
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {userType === 'guest' ? (
            <>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Guest name (optional)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Room ID"
                  value={guestRoomId}
                  onChange={(e) => setGuestRoomId(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <>
              {!isLogin && (
            <div className="input-group">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          )}
          <div className="input-group">
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          {!isLogin && userType === 'admin' && (
            <div className="input-group">
              <input
                type="password"
                placeholder="Admin access key"
                value={formData.adminKey}
                onChange={(e) => setFormData({ ...formData, adminKey: e.target.value })}
                required
              />
            </div>
          )}
            </>
          )}

          <button type="submit" className="auth-submit-btn">
            {userType === 'guest' ? (
              <><Users size={20} /> Join Room</>
            ) : isLogin ? (
              <><LogIn size={20} /> Login</>
            ) : (
              <><UserPlus size={20} /> Register</>
            )}
          </button>
        </form>

        <div className="auth-switch">
          {userType !== 'guest' && (
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <span onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? ' Sign up' : ' Log in'}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
