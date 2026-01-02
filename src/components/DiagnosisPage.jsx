import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles/DiagnosisPage.css';

const DiagnosisPage = () => {
  const INITIAL_MESSAGE = {
    id: 1,
    text: "Halo! Saya Asisten Medis AI. Ada keluhan kesehatan apa hari ini?",
    sender: 'bot',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    urls: [] 
  };

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null); 
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, [messages, navigate]);

  const parseBold = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g); 
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      return part;
    });
  };

  const formatMessage = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const formattedContent = [];
    let listItems = [];
    let inList = false;

    lines.forEach((line, index) => {
      const isListItem = /^\d+\.\s/.test(line);
      const isEmpty = line.trim() === "";

      if (isListItem) {
        inList = true;
        listItems.push(<li key={`li-${index}`}>{parseBold(line)}</li>);
      } else {
        if (isEmpty) return; 
        if (inList) {
          formattedContent.push(<ul key={`ul-${index}`} className="raw-list">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        formattedContent.push(<p key={`p-${index}`}>{parseBold(line)}</p>);
      }
    });

    if (inList && listItems.length > 0) {
      formattedContent.push(<ul key="ul-last" className="raw-list">{listItems}</ul>);
    }
    return formattedContent;
  };

  const handleNewChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setInputMessage('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // 1. Buat object pesan user
    const userMsg = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Update state local dulu (Optimistic UI)
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    // 2. Siapkan History Chat (Ambil 4 pesan terakhir untuk konteks)
    const chatHistory = updatedMessages
      .filter(m => m.text && m.sender !== 'system') // Filter pesan valid
      .slice(-4) // Batasi hanya 4 interaksi terakhir agar tidak terlalu panjang
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant', // Map ke format backend
        content: m.text
      }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        // Kirim message + history
        body: JSON.stringify({ 
            message: userMsg.text,
            history: chatHistory 
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const data = await response.json();
      
      const botMsg = {
        id: updatedMessages.length + 2,
        text: data.response || "Maaf, saya tidak mengerti.",
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        urls: data.urls || [] 
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error("Error:", error);
      const errorMsg = {
         id: updatedMessages.length + 2,
         text: "Gagal terhubung ke server. Mohon periksa koneksi Anda.",
         sender: 'bot',
         time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
         urls: []
      }
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="diagnosis-page">
      <div className="chat-container">
        <div className="chat-header-internal">
          <div className="chat-title">
            <h3>Konsultasi Medis</h3>
            <span className="status-dot"></span> Online
          </div>
          <button className="new-chat-btn" onClick={handleNewChat} title="Mulai Sesi Baru">🔄 Chat Baru</button>
        </div>

        <div className="messages-area">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
              <div className={`message-bubble ${msg.sender}`}>
                <div className="message-content">{formatMessage(msg.text)}</div>
                
                {/* --- DISPLAY URL REFERENCES (CAPSULE STYLE) --- */}
                {msg.sender === 'bot' && msg.urls && msg.urls.length > 0 && (
                    <div className="source-urls-container">
                        <span className="source-label">Referensi:</span>
                        <div className="url-tags-list">
                            {msg.urls.map((url, idx) => (
                                <a 
                                  key={idx} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="source-url-tag"
                                  title={url}
                                >
                                    🔗 Sumber {idx + 1}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                {/* ----------------------------------------------- */}

                <span className="time-stamp">{msg.time}</span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-wrapper bot">
              <div className="message-bubble bot typing"><span>Sedang mengetik...</span></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSendMessage}>
          <input type="text" placeholder="Tulis keluhan Anda di sini..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} disabled={isLoading} />
          <button type="submit" disabled={isLoading || !inputMessage.trim()}>Kirim</button>
        </form>
      </div>
    </div>
  );
};
export default DiagnosisPage;