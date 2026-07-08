import React, { useEffect, useState, useContext, useRef } from "react";
import { socket } from "../socket";
import { AuthContext } from "../context/AuthContext";
import { Send, Smile, Loader } from "lucide-react";
import { API_URL } from "../config";

const Chat = ({ roomId, readOnly = false }) => {
  const { user } = useContext(AuthContext);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // GIF selector state
  const [showGifSelector, setShowGifSelector] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingGifs, setLoadingGifs] = useState(false);

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

  // Fetch trending/initial GIFs when selector is opened
  useEffect(() => {
    if (showGifSelector) {
      fetchTrendingGifs();
    }
  }, [showGifSelector]);

  const fetchTrendingGifs = async () => {
    setLoadingGifs(true);
    try {
      const storedToken = localStorage.getItem("token");
      const headers = {};
      if (storedToken) {
        headers["token"] = storedToken;
      }
      const response = await fetch(`${API_URL}/api/gifs/trending`, { headers });
      const data = await response.json();
      setGifs(data.gifs || []);
    } catch (err) {
      console.error("Error fetching trending GIFs:", err);
    } finally {
      setLoadingGifs(false);
    }
  };

  const handleGifSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      fetchTrendingGifs();
      return;
    }

    setLoadingGifs(true);
    try {
      const storedToken = localStorage.getItem("token");
      const headers = {};
      if (storedToken) {
        headers["token"] = storedToken;
      }
      const response = await fetch(`${API_URL}/api/gifs/search?q=${encodeURIComponent(query)}`, { headers });
      const data = await response.json();
      setGifs(data.gifs || []);
    } catch (err) {
      console.error("Error searching GIFs:", err);
    } finally {
      setLoadingGifs(false);
    }
  };

  const sendGif = (gifUrl) => {
    if (readOnly || !user) return;
    socket.emit("sendMessage", { roomId, message: "", username: user.name, gifUrl });
    setShowGifSelector(false);
  };

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
              {m.gifUrl ? (
                <div className="message-gif-bubble">
                  <img src={m.gifUrl} alt="gif" className="message-gif-img" />
                </div>
              ) : (
                <div className="message-bubble">
                  {m.message}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <div className="gif-button-container">
          <button
            type="button"
            className="gif-toggle-btn"
            onClick={() => setShowGifSelector(!showGifSelector)}
            title="Choose a GIF"
            disabled={readOnly}
          >
            <span className="gif-logo-text">GIF</span>
          </button>
          
          {showGifSelector && (
            <div className="gif-selector-popover">
              <div className="gif-search-container">
                <input
                  type="text"
                  placeholder="Search GIFs..."
                  value={searchQuery}
                  onChange={handleGifSearch}
                  className="gif-search-bar"
                  autoFocus
                />
              </div>
              <div className="gif-grid">
                {loadingGifs ? (
                  <div className="gif-loading">
                    <Loader size={18} className="spinner" />
                  </div>
                ) : gifs.length === 0 ? (
                  <div className="gif-empty">No GIFs found</div>
                ) : (
                  gifs.map((gif) => (
                    <img
                      key={gif.id}
                      src={gif.url}
                      alt={gif.title}
                      className="gif-grid-item"
                      onClick={() => sendGif(gif.url)}
                    />
                  ))
                )}
              </div>
              <div className="giphy-attribution">Powered by GIPHY</div>
            </div>
          )}
        </div>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
          disabled={readOnly}
        />
        <button type="submit" className="chat-send-btn" disabled={!message.trim() || readOnly}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default Chat;
