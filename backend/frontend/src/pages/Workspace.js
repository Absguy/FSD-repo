import React, { useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import Chat from '../components/Chat';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import './Workspace.css';

const Workspace = () => {
  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);
  const isGuest = !user;
  const displayName = user?.name || "Guest";

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="workspace-container">
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
      
      <div className="workspace-body">
        <div className="editor-pane">
          <CodeEditor roomId={roomId} readOnly={isGuest} />
        </div>
        <div className="chat-pane">
          <Chat roomId={roomId} readOnly={isGuest} />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
