import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getAuth, signOut } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { FaSignOutAlt, FaTrash, FaCloudDownloadAlt, FaPaperPlane, FaFileUpload, FaRobot, FaUserCircle } from "react-icons/fa";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
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
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      const token = await user.getIdToken();
      const res = await axios.get('http://localhost:5000/api/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.history || []);
      setAnalytics({ questions: res.data.history?.length || 0 });
    };
    if (user) fetchHistory();
  }, [user]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
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
      const res = await axios.post('http://localhost:5000/api/ask', { question: input }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseText = res.data.answer;
      setMessages([...newMessages, { sender: 'bot', text: responseText }]);
      addHistory?.();
      setAnalytics(prev => ({ questions: prev.questions + 1 }));
    } catch (err) {
      setMessages([...newMessages, { sender: 'bot', text: "Sorry, there was an error connecting to the bot." }]);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const signOutUser = () => signOut(auth);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    messages.forEach((msg, index) => {
      doc.text(`${msg.sender.toUpperCase()}: ${msg.text}`, 10, 10 + index * 10);
    });
    doc.save('chat-history.pdf');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : '');
    if (file && file.type === 'application/pdf') {
      const text = await file.text();
      setPreview(text.slice(0, 300));
    }
  };

  return (
    <div style={{display: "flex", height: "100vh", background: "linear-gradient(120deg, #21232a 60%, #101016 100%)"}}>
      {/* Sidebar */}
      <aside style={{
        width: "300px", 
        background: "rgba(20,22,33,0.99)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "28px 18px 16px 18px",
        borderRight: "1.5px solid #262630",
        boxShadow: "3px 0 18px 0 #10101622"
      }}>
        <div style={{display:"flex", alignItems:"center", marginBottom: "30px"}}>
          <img src={user.photoURL || ""} alt="User" style={{width: 54, height: 54, borderRadius: "50%", border: "2.5px solid #fff", marginRight: 14, background:'#393953'}} />
          <div>
            <div style={{fontWeight: 700, fontSize: 17, marginBottom: 3, lineHeight: 1.1}}>{user.displayName}</div>
            <div style={{fontSize: 13, color: "#aaa", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis"}}>{user.email}</div>
          </div>
        </div>
        <div style={{fontWeight: 700, fontSize: 20, marginBottom: 10, letterSpacing: "0.5px"}}>AI CareerBot</div>

        <div style={{flex:1, overflowY:"auto", marginBottom:16, marginTop:2}}>
          {messages.filter(msg=>msg.sender==='user').map((msg,i)=>(
            <div key={i} style={{
              color:"#b7b7be",
              fontSize:15,
              marginBottom: 8,
              cursor:"pointer",
              borderLeft:"3px solid #4343a3",
              paddingLeft:10,
              whiteSpace:"nowrap",
              overflow:"hidden",
              textOverflow:"ellipsis"
            }}>
              • {msg.text}
            </div>
          ))}
        </div>

        <div style={{display:"flex", gap:8, marginBottom:10}}>
          <button onClick={() => setMessages([])} style={{
            flex:1, background:"#ffb100", color:"#222", fontWeight:600, border:"none", borderRadius:8, padding:"8px 0", fontSize:14, cursor:"pointer"}}
          ><FaTrash style={{marginRight:6, verticalAlign:"middle"}}/>Clear History</button>
          <button onClick={signOutUser} style={{
            flex:1, background:"#e74c3c", color:"#fff", fontWeight:600, border:"none", borderRadius:8, padding:"8px 0", fontSize:14, cursor:"pointer"}}
          ><FaSignOutAlt style={{marginRight:6, verticalAlign:"middle"}}/>Sign Out</button>
        </div>
        <button onClick={handleDownloadPDF} style={{
          background:"#1dd16a", color:"#fff", fontWeight:600, border:"none", borderRadius:8, padding:"9px 0", fontSize:15, cursor:"pointer", marginBottom:8, width:"100%"
        }}><FaCloudDownloadAlt style={{marginRight:7, verticalAlign:"middle"}}/>Download Chat</button>
        <div style={{fontSize:13, color:"#aaa", marginBottom:7}}>Questions asked: <b>{analytics.questions}</b></div>
        <select style={{width:"100%", background:"#23233b", color:"#fff", fontSize:14, padding:"7px", borderRadius:7, border:"none"}}
          value={lang} onChange={e => { setLang(e.target.value); i18n.changeLanguage(e.target.value); }}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="es">Spanish</option>
        </select>
      </aside>

      {/* Main chat area */}
      <main style={{flex:1, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden"}}>
        {/* Floating Bot Avatar */}
        <div style={{
          position:"fixed", top: 24, right: 38, zIndex:99, animation:"moveUpDown 2s infinite alternate"
        }}>
          <span style={{
            background:"linear-gradient(135deg,#3936a3 60%,#19e4a3 100%)",
            padding:2, borderRadius:"50%", display:"inline-block"
          }}>
            <FaRobot size={52} color="#fff" style={{background:"#28284b", borderRadius:"50%", padding:5}}/>
          </span>
        </div>
        {/* Chat messages */}
        <div ref={chatRef} style={{
          flex:1, overflowY:"auto", padding:"36px 0 160px 0", width:"100%", display:"flex", flexDirection:"column", gap:"30px"
        }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              display:"flex",
              justifyContent: msg.sender==="user" ? "flex-end" : "flex-start"
            }}>
              <div style={{
                maxWidth:"650px",
                minWidth:"120px",
                padding:"20px 26px",
                borderRadius: "22px",
                fontSize: 18,
                fontWeight: 500,
                boxShadow:"0 4px 24px #0006",
                color: "#fff",
                background: msg.sender==="user"
                  ? "linear-gradient(135deg,#3936a3 60%,#19e4a3 100%)"
                  : "linear-gradient(120deg,#22243a 70%,#137bca 100%)",
                marginRight: msg.sender==="user" ? 15 : 0,
                marginLeft: msg.sender==="bot" ? 15 : 0,
                display:"flex",
                alignItems:"flex-start",
                gap:14,
                fontFamily: "Inter, Segoe UI, Arial, sans-serif",
                lineHeight: 1.7,
                overflowWrap: "break-word",
                wordBreak: "break-word"
              }}>
                {msg.sender==="bot" && <FaRobot size={24} color="#fff" style={{marginRight:8}} />}
                <ReactMarkdown
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            borderRadius: "10px",
                            fontSize: "16px",
                            background: "#171b23",
                          }}
                          {...props}
                        >{String(children).replace(/\n$/, "")}</SyntaxHighlighter>
                      ) : (
                        <code
                          style={{
                            background: "#232b3b",
                            borderRadius: "5px",
                            padding: "2px 6px",
                            fontSize: "16px",
                          }}
                          {...props}
                        >{children}</code>
                      );
                    }
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
                {msg.sender==="user" && <FaUserCircle size={24} color="#fff" style={{marginLeft:8}} />}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{marginLeft:15, color:"#888", fontStyle:"italic", fontSize:16}}>CareerBot is typing...</div>
          )}
        </div>
        {/* Input Bar */}
        <form
          onSubmit={e => {e.preventDefault(); sendMessage();}}
          style={{
            position:"fixed",
            left:300, // sidebar width
            right:0,
            bottom:0,
            background:"linear-gradient(to top,#18181c 90%,transparent)",
            padding:"26px 32px 24px 32px",
            display:"flex",
            alignItems:"center",
            gap:14,
            boxShadow:"0 -4px 24px #000a",
            zIndex:20
          }}
        >
          <input
            type="text"
            placeholder="Ask anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{
              flex:1,
              background:"#23233b",
              color:"#fff",
              border:"none",
              borderRadius:20,
              padding:"16px 22px",
              fontSize:18,
              outline:"none",
              boxShadow:"0 2px 10px 0 #0003",
              fontWeight:500
            }}
            autoFocus
          />
          <label htmlFor="upload-btn" style={{
            display:"flex", alignItems:"center", cursor:"pointer", background:"#23233b", borderRadius:18, padding:"9px 13px"
          }}>
            <FaFileUpload size={22} color="#19e4a3"/>
            <input
              id="upload-btn"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{display:"none"}}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              background: "linear-gradient(90deg,#1dd16a 40%,#3936a3 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 22,
              padding: "13px 32px",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow:"0 2px 10px #0003",
              transition:"background 0.2s, transform 0.2s",
              display:"flex",
              alignItems:"center",
              gap:8,
              opacity: loading ? 0.6 : 1
            }}
          >
            Send <FaPaperPlane style={{marginLeft:3}}/>
          </button>
        </form>
        {/* File preview */}
        {preview && (
          <div style={{
            position:"fixed", left: 320, right:40, bottom:100, zIndex:100,
            background:"#21232aee", color:"#fff", padding:20, borderRadius:14, maxHeight:180, overflow:"auto", fontSize:14, boxShadow:"0 4px 24px #000c"
          }}>
            <div style={{fontWeight:700, marginBottom:8}}>{fileName}</div>
            <pre style={{whiteSpace:"pre-wrap", wordBreak:"break-all"}}>{preview}</pre>
          </div>
        )}
      </main>
      {/* Style for floating bot avatar animation */}
      <style>{`
        @keyframes moveUpDown {
          0% { transform: translateY(0px);}
          100% { transform: translateY(-18px);}
        }
        ::-webkit-scrollbar {width: 7px; background: #181825;}
        ::-webkit-scrollbar-thumb {background: #38385a; border-radius: 4px;}
        ::selection { background: #3936a3; color: #fff; }
      `}</style>
    </div>
  );
}