import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getAuth, signOut } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import i18n from 'i18next';

export default function Chat({ user, addHistory }) {
  const auth = getAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const [lang, setLang] = useState('en');
  const [analytics, setAnalytics] = useState({ questions: 0 });
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      const token = await user.getIdToken();
      const res = await axios.get('http://localhost:5000/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.history || []);
      setAnalytics({ questions: res.data.history?.length || 0 });
    };
    if (user) fetchHistory();
  }, [user]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    setLoading(true);
    setInput('');

    try {
      const token = await user.getIdToken();
      const res = await axios.post('http://localhost:5000/ask', { question: input }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseText = res.data.answer;
      setMessages([...newMessages, { sender: 'bot', text: responseText }]);
      addHistory?.();
      setAnalytics(prev => ({ questions: prev.questions + 1 }));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const signOutUser = () => {
    signOut(auth);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    messages.forEach((msg, index) => {
      doc.text(`${msg.sender.toUpperCase()}: ${msg.text}`, 10, 10 + index * 10);
    });
    doc.save('chat-history.pdf');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      const text = await file.text();
      setPreview(text.slice(0, 300));
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-72 bg-zinc-900 text-white p-4 flex flex-col border-r border-zinc-700">
        <div className="flex items-center space-x-3 mb-4">
          <img src={user.photoURL} alt="User" className="w-12 h-12 rounded-full border-2 border-white" />
          <div>
            <p className="text-sm font-semibold leading-tight">{user.displayName}</p>
            <p className="text-xs text-zinc-400 truncate">{user.email}</p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-3">AI CareerBot</h2>
        <div className="flex-1 overflow-y-auto space-y-2 text-sm custom-scroll">
          {messages.filter(msg => msg.sender === 'user').map((msg, i) => (
            <div key={i} className="truncate text-zinc-300 hover:text-white cursor-pointer">• {msg.text}</div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <button onClick={() => setMessages([])} className="px-4 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded">Clear History</button>
          <button onClick={signOutUser} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded">Sign Out</button>
          <button onClick={handleDownloadPDF} className="px-4 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded">📥 Download Chat</button>
          <div className="text-xs text-zinc-400 mt-2">Questions asked: {analytics.questions}</div>
          <select className="w-full bg-zinc-800 text-white text-xs mt-2 p-1 rounded" value={lang} onChange={e => { setLang(e.target.value); i18n.changeLanguage(e.target.value); }}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
          </select>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col flex-1 bg-gradient-to-br from-zinc-950 to-zinc-900 text-white">
        <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl px-5 py-3 rounded-3xl shadow-md whitespace-pre-wrap text-sm transition-all duration-200 ease-in-out ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-800 text-white rounded-bl-none'}`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-zinc-400 italic animate-pulse">CareerBot is typing...</div>}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <input
              className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-400"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="text-xs text-zinc-300"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-blue-600 px-5 py-2 rounded-xl text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Ask
            </button>
          </div>
          {preview && (
            <pre className="text-xs text-zinc-400 mt-3 p-2 bg-zinc-800 rounded-lg max-h-40 overflow-auto">
              {preview}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
