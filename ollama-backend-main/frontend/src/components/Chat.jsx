import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { getAuth, signOut } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";
import {
  FaSignOutAlt,
  FaTrash,
  FaCloudDownloadAlt,
  FaPaperPlane,
  FaFileUpload,
  FaRobot,
  FaUserCircle,
  FaRegCopy,
  FaCheckCircle,
  FaMicrophone,
  FaBolt,
} from "react-icons/fa";
import Tilt from "react-parallax-tilt";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import i18n from "i18next";
import { Particles } from "@tsparticles/react";
import confetti from "canvas-confetti";
import { Howl } from "howler";

const NEON = {
  bg: "#06061a",
  glass: "rgba(9,12,30,0.82)",
  border: "1.5px solid #00ffe7",
  neon: "0 0 32px #00ffe7, 0 0 12px #7d69ff",
  accent: "#00ffe7",
  accent2: "#7d69ff",
  white: "#fff",
  codeBg: "linear-gradient(90deg,#0b0c23 70%,#00e5ff 100%)",
  userBubble: "rgba(12,18,32,0.97)",
  botBubble: "rgba(17,23,45,0.97)",
  sidebarBg: "rgba(9,12,30,0.98)",
  sidebarShadow: "0 2px 24px #00ffe799, 0 1px 10px #7d69ff33",
  btn: "linear-gradient(90deg,#00ffe7 40%,#7d69ff 100%)"
};

function playSound(src) {
  try {
    new Howl({ src: [src], volume: 0.18 }).play();
  } catch {}
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      aria-label="Copy code"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        playSound("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9e7e7f.mp3");
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        position: "absolute",
        top: 10,
        right: 14,
        background: "rgba(0,255,231,0.12)",
        border: "none",
        borderRadius: 8,
        color: NEON.accent,
        padding: "4px 8px",
        cursor: "pointer",
        fontSize: 13,
        boxShadow: "0 2px 12px 0 #00ffe744",
        display: "flex",
        alignItems: "center",
        gap: 3,
        zIndex: 2,
        transition: "background 0.2s",
      }}
    >
      {copied ? <FaCheckCircle size={14} color={NEON.accent} /> : <FaRegCopy size={14} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SoundWaves({ color = "#00ffe7", size = 38 }) {
  return (
    <svg width={size} height={size} style={{ position: "absolute", left: -7, top: -7, zIndex: 0 }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2.3}
        fill="none"
        stroke={color}
        strokeWidth="2"
        style={{
          opacity: 0.2,
          filter: `drop-shadow(0 0 16px ${color})`,
          animation: "wavePulse 2s infinite alternate",
        }}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2.8}
        fill="none"
        stroke={color}
        strokeWidth="1"
        style={{
          opacity: 0.4,
          filter: `drop-shadow(0 0 6px ${color})`,
          animation: "wavePulse 2.4s infinite alternate-reverse",
        }}
      />
    </svg>
  );
}

const MemoParticles = React.memo(({ NEON }) => (
  <>
    <Particles
      id="tsparticles"
      options={{
        background: { color: "transparent" },
        fpsLimit: 60,
        particles: {
          color: { value: [NEON.accent, NEON.accent2, "#fff"] },
          links: { enable: true, color: NEON.accent, opacity: 0.09 },
          move: { enable: true, speed: 1.2, outModes: { default: "bounce" } },
          number: { value: 48 },
          opacity: { value: 0.17 },
          shape: { type: ["circle", "edge"] },
          size: { value: { min: 1.2, max: 4 } },
        },
        detectRetina: true,
      }}
      style={{
        position: "absolute",
        zIndex: 1,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
    />
    <svg style={{
      position: "absolute", left: 0, top: 0, width: "100vw", height: "100vh", zIndex: 1, pointerEvents: "none",
      opacity: 0.34
    }}>
      <defs>
        <radialGradient id="aurora" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#00ffe7" stopOpacity="0.32" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <ellipse cx="60%" cy="32%" rx="550" ry="190" fill="url(#aurora)">
        <animate attributeName="rx" values="540;630;540" dur="7s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="36%;28%;36%" dur="11s" repeatCount="indefinite"/>
      </ellipse>
    </svg>
  </>
));

export default function Chat({ user, addHistory }) {
  if (!user) return <div>Loading user...</div>;

  const auth = getAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const [lang, setLang] = useState("en");
  const [analytics, setAnalytics] = useState({ questions: 0 });
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const [typingStep, setTypingStep] = useState(0);
  const [typingActive, setTypingActive] = useState(false);
  const [listening, setListening] = useState(false);

  // Voice input
  let recognition;
  if ("webkitSpeechRecognition" in window) {
    recognition = new window.webkitSpeechRecognition();
    recognition.lang = lang === "en" ? "en-US" : lang === "hi" ? "hi-IN" : "es-ES";
    recognition.interimResults = false;
    recognition.continuous = false;
  }

  function startVoiceInput() {
    if (!recognition) return;
    setListening(true);
    recognition.start();
    playSound("https://cdn.pixabay.com/audio/2022/07/26/audio_124b3b5b1c.mp3");
    recognition.onresult = (event) => {
      setInput(event.results[0][0].transcript);
      setListening(false);
      playSound("https://cdn.pixabay.com/audio/2022/07/26/audio_124b3b5b1c.mp3");
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  }

  function celebrate() {
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.45 },
      zIndex: 9999,
      colors: [NEON.accent, NEON.accent2, "#fff", "#191970"],
    });
    playSound("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9e7e7f.mp3");
  }

  useEffect(() => {
    const fetchHistory = async () => {
      const token = await user.getIdToken();
      const res = await axios.get("http://localhost:5000/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.history || []);
      setAnalytics({ questions: res.data.history?.length || 0 });
    };
    if (user) fetchHistory();
  }, [user]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, typingStep]);

  // Typing animation
  useEffect(() => {
    if (botTyping && messages.length > 0 && messages[messages.length - 1].sender === "bot") {
      setTypingStep(0);
      setTypingActive(true);
      const full = messages[messages.length - 1].text || "";
      let idx = 0;
      const interval = setInterval(() => {
        setTypingStep(i => {
          idx = i + 1;
          if (idx > full.length) {
            clearInterval(interval);
            setTypingActive(false);
            setBotTyping(false);
            return i;
          }
          return idx;
        });
      }, 11 + Math.random() * 14);
      return () => clearInterval(interval);
    }
  }, [botTyping, messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { sender: "user", text: input }];
    setMessages(newMessages);
    setLoading(true);
    setInput("");
    setBotTyping(false);
    setTypingActive(false);

    try {
      const token = await user.getIdToken();
      const res = await axios.post(
        "http://localhost:5000/api/ask",
        { question: input },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const responseText = res.data.answer;
      setMessages([...newMessages, { sender: "bot", text: responseText }]);
      addHistory?.();
      setAnalytics((prev) => ({ questions: prev.questions + 1 }));
      setBotTyping(true);
      celebrate();
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          sender: "bot",
          text: "Sorry, there was an error connecting to the bot.",
        },
      ]);
      setBotTyping(false);
    } finally {
      setLoading(false);
    }
  }, [input, messages, user, addHistory]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
    doc.save("chat-history.pdf");
    celebrate();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : "");
    if (file && file.type === "application/pdf") {
      const text = await file.text();
      setPreview(text.slice(0, 300));
    }
  };

  const particlesMemo = useMemo(() => <MemoParticles NEON={NEON} />, []);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: NEON.bg,
      fontFamily: "Poppins, Segoe UI, Arial, sans-serif",
      overflow: "hidden",
      position: "relative"
    }}>
      {particlesMemo}

      <aside style={{
        width: "340px",
        background: NEON.sidebarBg,
        color: NEON.white,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "32px 18px 16px 18px",
        borderRight: NEON.border,
        boxShadow: NEON.sidebarShadow,
        backdropFilter: "blur(24px)",
        zIndex: 10,
        position: "relative"
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "38px", position: "relative" }}>
          <div style={{ position: "relative", marginRight: 18 }}>
            <span style={{
              borderRadius: "50%",
              boxShadow: NEON.neon,
              background: "#111a28",
              padding: 3,
              display: "inline-block",
              animation: "spinPulse 2.4s infinite alternate"
            }}>
              <img
                src={user.photoURL || ""}
                alt="User"
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  border: `2.5px solid ${NEON.white}`,
                  background: "#121624",
                  boxShadow: "0 2px 18px #00ffe733"
                }}
              />
              <SoundWaves color={NEON.accent} />
            </span>
          </div>
          <div>
            <div style={{
              fontWeight: 800, fontSize: 19, marginBottom: 3, color: NEON.white,
              textShadow: `0 1px 10px ${NEON.accent2}55`
            }}>{user.displayName}</div>
            <div style={{
              fontSize: 13, color: "#cafffd", maxWidth: 180,
              overflow: "hidden", textOverflow: "ellipsis"
            }}>{user.email}</div>
          </div>
        </div>
        <div style={{
          fontWeight: 900, fontSize: 25, marginBottom: 14, letterSpacing: "0.5px",
          background: NEON.btn,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 2px 14px #00ffe7aa",
          display: "flex", alignItems: "center", gap: 7
        }}>
          <FaBolt color={NEON.accent} style={{ marginRight: 2, verticalAlign: "middle" }} />
          AI CareerBot
        </div>
        <div style={{
          flex: 1, overflowY: "auto", marginBottom: 22, marginTop: 2, paddingRight: 2
        }}>
          {messages.filter((msg) => msg.sender === "user").map((msg, i) => (
            <div key={i} style={{
              color: NEON.accent,
              fontSize: 15,
              marginBottom: 11,
              cursor: "pointer",
              borderLeft: `3px solid ${NEON.accent}`,
              paddingLeft: 12,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontWeight: 500,
              letterSpacing: 0.1,
              textShadow: `0 2px 8px ${NEON.accent}30`
            }}>
              • {msg.text}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button
            onClick={() => { setMessages([]); celebrate(); }}
            style={{
              flex: 1,
              background: "linear-gradient(90deg,#ff4a3d 40%,#ffbe30 100%)",
              color: "#fff",
              fontWeight: 700,
              border: "none",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 2px 12px #ffbe3040, 0 1.5px 9px #ff4a3d22",
              transition: "transform 0.14s",
            }}
          >
            <FaTrash style={{ marginRight: 7, verticalAlign: "middle" }} />
            Clear
          </button>
          <button
            onClick={signOutUser}
            style={{
              flex: 1,
              background: "linear-gradient(90deg,#23233b 60%,#21ffb7 100%)",
              color: "#fff",
              fontWeight: 700,
              border: "none",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 2px 12px #21ffb722",
              transition: "transform 0.14s",
            }}
          >
            <FaSignOutAlt style={{ marginRight: 7, verticalAlign: "middle" }} />
            Sign Out
          </button>
        </div>
        <button
          onClick={handleDownloadPDF}
          style={{
            background: NEON.btn,
            color: "#23233b",
            fontWeight: 700,
            border: "none",
            borderRadius: 10,
            padding: "12px 0",
            fontSize: 16,
            cursor: "pointer",
            marginBottom: 10,
            width: "100%",
            boxShadow: "0 2px 12px #21ffb722, 0 1.5px 9px #4c38ff12",
            transition: "transform 0.14s",
          }}
        >
          <FaCloudDownloadAlt style={{ marginRight: 8, verticalAlign: "middle" }} />
          Download Chat
        </button>
        <div style={{ fontSize: 14, color: "#aaa", marginBottom: 9 }}>
          Questions asked: <b>{analytics.questions}</b>
        </div>
        <select
          style={{
            width: "100%",
            background: "#23233b",
            color: "#fff",
            fontSize: 15,
            padding: "10px",
            borderRadius: 8,
            border: "none",
            fontWeight: 600,
            outline: "none",
            marginBottom: 4,
            boxShadow: "0 2px 12px #23233b22",
          }}
          value={lang}
          onChange={(e) => {
            setLang(e.target.value);
            i18n.changeLanguage(e.target.value);
          }}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="es">Spanish</option>
        </select>
      </aside>
      <main style={{
        flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden"
      }}>
        <div style={{
          position: "fixed", top: 28, right: 44, zIndex: 99,
          animation: "moveUpDown 2s infinite alternate",
          filter: `drop-shadow(0 0 24px ${NEON.accent2})`
        }}>
          <span style={{
            background: `linear-gradient(135deg,#050d26 60%,${NEON.accent} 100%)`,
            padding: 4, borderRadius: "50%", display: "inline-block",
            boxShadow: NEON.neon, animation: "pulseGlow 2.7s infinite alternate", position: "relative"
          }}>
            <FaRobot size={59} color={NEON.white} style={{
              background: "#1b1836", borderRadius: "50%", padding: 5, position: "relative", zIndex: 2
            }} />
            <SoundWaves color={NEON.accent2} size={52} />
          </span>
          <svg width="74" height="74" style={{
            position: "absolute", left: "-9px", top: "-9px", zIndex: 0, opacity: 0.5
          }}>
            <ellipse cx="37" cy="37" rx="32" ry="15"
              fill="none" stroke={NEON.accent2} strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 8px ${NEON.accent2})` }}>
              <animate attributeName="rx" values="32;36;32" dur="2s" repeatCount="indefinite" />
            </ellipse>
          </svg>
        </div>
        <div ref={chatRef} style={{
          flex: 1, overflowY: "auto", padding: "48px 0 200px 0",
          width: "100%", display: "flex", flexDirection: "column", gap: "36px",
          zIndex: 2, pointerEvents: "auto"
        }}>
          {messages.map((msg, idx) => {
            const isBot = msg.sender === "bot";
            const isLastBot = isBot && idx === messages.length - 1 && (botTyping || typingActive);
            let textToShow = msg.text;
            if (isLastBot && typingActive) {
              textToShow = msg.text.slice(0, typingStep);
            }
            return (
              <div key={idx} style={{
                display: "flex",
                justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                width: "100%", perspective: "1600px"
              }}>
                <Tilt
                  tiltReverse
                  glareEnable
                  glareMaxOpacity={0.19}
                  scale={1.03}
                  transitionSpeed={500}
                  style={{ borderRadius: 30, background: "none" }}
                >
                  <div style={{
                    maxWidth: "680px",
                    minWidth: "130px",
                    padding: "26px 36px",
                    borderRadius: "32px",
                    fontSize: 19,
                    fontWeight: 500,
                    marginRight: msg.sender === "user" ? 25 : 0,
                    marginLeft: msg.sender === "bot" ? 25 : 0,
                    marginTop: 4,
                    marginBottom: 4,
                    position: "relative",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    backgroundClip: "padding-box",
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                    whiteSpace: "pre-line",
                    transition: "box-shadow 0.25s, transform 0.27s",
                    willChange: "transform",
                    animation: "bubbleIn 0.7s cubic-bezier(.54,1.6,.59,.99)",
                    boxShadow: msg.sender === "user" ? NEON.neon : "0 4px 40px #00ffe733",
                    color: NEON.white,
                    background: isBot ? NEON.botBubble : NEON.userBubble,
                    border: NEON.border
                  }}>
                    {isBot && (
                      <FaRobot size={26} color={NEON.accent2} style={{
                        marginRight: 14, marginTop: 2,
                        filter: `drop-shadow(0 0 8px ${NEON.accent})`,
                        animation: "botPop 0.7s", verticalAlign: "middle"
                      }} />
                    )}
                    <div style={{
                      flex: 1, width: "100%", overflowWrap: "break-word", wordBreak: "break-word",
                      fontSize: 18, lineHeight: 1.7, minHeight: 18, letterSpacing: 0.01
                    }}>
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            if (!inline && match) {
                              return (
                                <div style={{ position: "relative", margin: "16px 0" }}>
                                  <CopyButton text={String(children).replace(/\n$/, "")} />
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{
                                      borderRadius: "12px",
                                      fontSize: "17px",
                                      background: NEON.codeBg,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      overflowX: "auto",
                                      padding: "22px 16px 18px 18px",
                                      border: NEON.border,
                                      boxShadow: "0 1.5px 12px #00ffe733",
                                      animation: "glowBorder 3s linear infinite"
                                    }}
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, "")}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            }
                            return (
                              <code style={{
                                background: "#111a28",
                                borderRadius: "7px",
                                padding: "3.5px 8px",
                                fontSize: "16.5px",
                                color: NEON.accent,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                boxShadow: "0 1.5px 8px #00ffe733"
                              }} {...props}>{children}</code>
                            );
                          },
                        }}
                      >
                        {textToShow}
                      </ReactMarkdown>
                      {isLastBot && typingActive && (
                        <span style={{
                          fontWeight: 700, color: NEON.accent, fontSize: 21, marginLeft: 3,
                          animation: "blink 1.2s linear infinite"
                        }}>|</span>
                      )}
                    </div>
                    {msg.sender === "user" && (
                      <FaUserCircle size={27} color={NEON.white} style={{
                        marginLeft: 16,
                        filter: `drop-shadow(0 0 8px ${NEON.accent2})`,
                        animation: "botPop 0.7s", verticalAlign: "middle"
                      }} />
                    )}
                  </div>
                </Tilt>
              </div>
            );
          })}
          {loading && !botTyping && (
            <div style={{
              marginLeft: 25, color: NEON.accent, fontStyle: "italic", fontSize: 17, letterSpacing: 1.2,
              textShadow: `0 0 8px ${NEON.accent}bb`
            }}>
              <span className="dot-typing" style={{ marginRight: 6 }}>
                <span>.</span><span>.</span><span>.</span>
              </span>
              CareerBot is thinking...
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          style={{
            position: "fixed",
            left: 340,
            right: 0,
            bottom: 0,
            background: NEON.glass,
            padding: "30px 38px 26px 38px",
            display: "flex",
            alignItems: "center",
            gap: 17,
            boxShadow: "0 -4px 38px #21ffb722",
            zIndex: 20,
            backdropFilter: "blur(18px)",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <input
            type="text"
            placeholder={listening ? "Listening..." : "Ask anything..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{
              flex: 1,
              background: "#0f1621",
              color: NEON.accent,
              border: "none",
              borderRadius: 20,
              padding: "18px 24px",
              fontSize: 19,
              outline: "none",
              boxShadow: "0 2px 16px 0 #00ffe744",
              fontWeight: 600,
              transition: "background 0.18s, box-shadow 0.18s",
              filter: "drop-shadow(0 0 10px #00ffe733)",
              border: "1.8px solid #00ffe7",
            }}
            autoFocus
          />
          <button type="button" aria-label="Voice Input" onClick={startVoiceInput}
            disabled={listening}
            style={{
              background: listening ? NEON.accent : "#23233b",
              borderRadius: "50%",
              width: 44,
              height: 44,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 7,
              cursor: listening ? "not-allowed" : "pointer",
              boxShadow: listening ? "0 0 16px #00ffe7" : "0 1.5px 8px #00ffe722",
              fontSize: 19,
            }}>
            <FaMicrophone color={listening ? "#101010" : "#00ffe7"} />
          </button>
          <label
            htmlFor="upload-btn"
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              background: "linear-gradient(135deg,#23233b 60%,#00ffe7 100%)",
              borderRadius: 22,
              padding: "11px 15px",
              boxShadow: "0 1.5px 8px #00ffe722",
              transition: "background 0.18s, box-shadow 0.18s",
            }}
          >
            <FaFileUpload size={24} color={NEON.accent} />
            <input
              id="upload-btn"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              background: NEON.btn,
              color: "#fff",
              border: "none",
              borderRadius: 24,
              padding: "15px 40px",
              fontSize: 20,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 14px #00ffe733",
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: loading ? 0.6 : 1,
              transition: "background 0.18s, box-shadow 0.18s",
            }}
          >
            Send <FaPaperPlane style={{ marginLeft: 3 }} />
          </button>
        </form>
        {preview && (
          <div
            style={{
              position: "fixed",
              left: 350,
              right: 40,
              bottom: 120,
              zIndex: 100,
              background: "rgba(33,255,183,0.08)",
              color: "#fff",
              padding: 26,
              borderRadius: 18,
              maxHeight: 220,
              overflow: "auto",
              fontSize: 15,
              boxShadow: "0 4px 28px #00ffe733, 0 2px 9px #23233b22",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                marginBottom: 10,
                color: NEON.accent,
                fontSize: 15,
              }}
            >
              {fileName}
            </div>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{preview}</pre>
          </div>
        )}
        <style>{`
          @keyframes moveUpDown {
            0% { transform: translateY(0px);}
            100% { transform: translateY(-18px);}
          }
          @keyframes spinPulse {
            0% { filter: drop-shadow(0 0 18px #00ffe7cc);}
            100% { filter: drop-shadow(0 0 8px #7d69ffcc);}
          }
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 18px #00ffe7cc;}
            100% { box-shadow: 0 0 32px #7d69ffcc;}
          }
          @keyframes blink {
            0%, 100% { opacity: 1;}
            50% { opacity: 0.3;}
          }
          @keyframes bubbleIn {
            0% { opacity: 0; transform: scale(0.8) translateY(60px);}
            100% { opacity: 1; transform: scale(1) translateY(0);}
          }
          @keyframes botPop {
            0% { opacity: 0; transform: scale(0.7) translateY(12px);}
            100% { opacity: 1; transform: scale(1) translateY(0);}
          }
          @keyframes wavePulse {
            0% { r: 15;}
            100% { r: 19;}
          }
          @keyframes glowBorder {
            0% { box-shadow: 0 0 8px #00ffe7cc;}
            50% { box-shadow: 0 0 13px #7d69ffcc;}
            100% { box-shadow: 0 0 8px #00ffe7cc;}
          }
          ::-webkit-scrollbar {width: 7px; background: #181825;}
          ::-webkit-scrollbar-thumb {background: #38385a; border-radius: 4px;}
          ::selection { background: #00ffe7; color: #fff; }
          .dot-typing span {
            animation: blink 1s infinite;
          }
          .dot-typing span:nth-child(2) { animation-delay: 0.2s; }
          .dot-typing span:nth-child(3) { animation-delay: 0.4s; }
          @media (max-width: 850px) {
            .chat-sidebar { display:none !important; }
            .input-bar-glassy { left:0 !important; }
          }
          @media (max-width: 600px) {
            .chat-root { flex-direction:column !important; }
            .main-chat-area { padding-left: 0 !important;}
            .input-bar-glassy { padding: 15px 8px 13px 8px !important;}
          }
        `}</style>
      </main>
    </div>
  );
}