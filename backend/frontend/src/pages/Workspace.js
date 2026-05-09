import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import Chat from '../components/Chat';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { socket } from '../socket';
import './Workspace.css';

const Workspace = () => {
  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [copied, setCopied] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Checking room...");
  const [roomData, setRoomData] = useState(null);
  const [admissionRequests, setAdmissionRequests] = useState([]);
  
  const isGuest = !user;
  const displayName = user?.name || "Guest";

  // 1. Check room existence and initial access
  useEffect(() => {
    const checkRoom = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/room/info/${roomId}`);
        const data = res.data;
        setRoomData(data);
        
        const isOwner = user && data.createdBy === user._id;
        const isParticipant = user && data.participants.includes(user._id);

        if (isOwner || isParticipant) {
          setAccessGranted(true);
        } else {
          setStatusMessage("Waiting to be admitted...");
          socket.emit("askToJoin", { roomId, username: displayName, userId: user?._id });
        }
      } catch (err) {
        if (err.response?.status === 404) {
          alert("Room does not exist.");
          navigate('/dashboard');
        } else {
          setStatusMessage("Error checking room.");
        }
      }
    };
    checkRoom();
  }, [roomId, user, displayName, navigate]);

  // 2. Listen for admission response (for joining users)
  useEffect(() => {
    const onAdmissionResponse = async ({ admitted, reason }) => {
      if (admitted) {
        if (user) {
          try {
            await axios.post(`${API_URL}/api/room/join`, { roomId }, { headers: { token: user.token } });
          } catch (e) {
            console.error("Failed to persist join in DB", e);
          }
        }
        setAccessGranted(true);
      } else {
        setStatusMessage(reason || "Admission denied by owner.");
      }
    };

    socket.on("admissionResponse", onAdmissionResponse);
    return () => socket.off("admissionResponse", onAdmissionResponse);
  }, [roomId, user]);

  // 3. Listen for admission requests (for room owner)
  useEffect(() => {
    const isOwner = user && roomData?.createdBy === user._id;
    if (!isOwner) return;

    const onAdmissionRequest = (req) => {
      setAdmissionRequests(prev => {
        // Prevent duplicates
        if (prev.find(r => r.askerSocketId === req.askerSocketId)) return prev;
        return [...prev, req];
      });
    };

    socket.on("admissionRequest", onAdmissionRequest);
    return () => socket.off("admissionRequest", onAdmissionRequest);
  }, [user, roomData]);

  const handleAdmission = (askerSocketId, admitted) => {
    socket.emit("admitDecision", { askerSocketId, admitted });
    setAdmissionRequests(prev => prev.filter(r => r.askerSocketId !== askerSocketId));
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="workspace-container">
      {/* Owner Notification Cards */}
      {admissionRequests.length > 0 && (
        <div className="admission-requests-container">
          {admissionRequests.map(req => (
            <div key={req.askerSocketId} className="admission-request-card">
              <p><strong>{req.username}</strong> is trying to enter</p>
              <div className="admission-actions">
                <button onClick={() => handleAdmission(req.askerSocketId, true)} className="btn-admit">Admit</button>
                <button onClick={() => handleAdmission(req.askerSocketId, false)} className="btn-deny">Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <header className="workspace-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            <ArrowLeft size={20} />
          </button>
          <h2>Workspace</h2>
        </div>
        <div className="header-center">
          <div className="room-badge" onClick={copyRoomId} title="Click to copy">
            <span>Room ID: {roomId}</span>
            {copied ? <Check size={14} className="copy-icon success" /> : <Copy size={14} className="copy-icon" />}
          </div>
          {isGuest && (
            <div className="room-badge" title="Guest access">
              <span>Guest (read-only)</span>
            </div>
          )}
        </div>
        <div className="header-right">
          <div className="user-indicator">
            <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
            <span className="username">{displayName}</span>
          </div>
        </div>
      </header>
      
      {accessGranted ? (
        <div className="workspace-body">
          <div className="editor-pane">
            <CodeEditor roomId={roomId} readOnly={isGuest} />
          </div>
          <div className="chat-pane">
            <Chat roomId={roomId} readOnly={isGuest} />
          </div>
        </div>
      ) : (
        <div className="waiting-room-body">
          <div className="waiting-card">
            <h2>{statusMessage}</h2>
            {(statusMessage.includes("Denied") || statusMessage.includes("offline") || statusMessage.includes("Error")) ? (
              <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">Go Back</button>
            ) : (
              <div className="loader"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
