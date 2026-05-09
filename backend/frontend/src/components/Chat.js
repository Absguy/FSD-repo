import React, { useEffect, useState, useContext, useRef } from "react";
import { socket } from "../socket";
import { AuthContext } from "../context/AuthContext";
import { Send } from "lucide-react";

const Chat = ({ roomId, readOnly = false }) => {
  const { user } = useContext(AuthContext);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    socket.on("receiveMessage", (msgData) => {
      setMessages((prev) => [...prev, msgData]);
    });

    return () => socket.off("receiveMessage");
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (readOnly) return;
    if (message.trim() === "" || !user) return;
    
    socket.emit("sendMessage", { roomId, message, username: user.name });
    setMessage("");
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Room Chat</h3>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && <div className="chat-empty">Say hello to the room!</div>}
        {messages.map((m, i) => {
          const isMe = m.username === user?.name;
          return (
            <div key={i} className={`chat-message ${isMe ? 'message-mine' : 'message-others'}`}>
              {!isMe && <span className="message-sender">{m.username}</span>}
              <div className="message-bubble">
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn" disabled={!message.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default Chat;
