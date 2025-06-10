import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import Chat from './components/Chat';
import './index.css';

const firebaseConfig = {
  apiKey: "AIzaSyCIVWTReL4dsLmUU37MFTLWvEYKMdwCjYQ",
  authDomain: "chatbot-project-c08f3.firebaseapp.com",
  projectId: "chatbot-project-c08f3",
  storageBucket: "chatbot-project-c08f3.appspot.com",
  messagingSenderId: "126109365055",
  appId: "1:126109365055:web:adbf510f06f863ed36d98a",
  measurementId: "G-Y39CGEFWN9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const signIn = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        setUser(result.user);
      })
      .catch((error) => {
        console.error("Sign in failed:", error.message);
      });
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">
        <button
          onClick={signIn}
          className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div style={{
      height: "100vh",
      position: "relative",
      backgroundColor: "#0f0f0f",
      color: "white",
      overflow: "hidden"
    }}>
      <Chat user={user} addHistory={() => {}} />
    </div>
  );
}

export default App;