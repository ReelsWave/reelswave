import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Create from './pages/Create';
import Settings from './pages/Settings';
import Autopilot from './pages/Autopilot';
import Checkout from './pages/Checkout';
import './index.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Navbar session={session} />
      <Routes>
        <Route path="/" element={<Landing session={session} />} />
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/signup"
          element={!session ? <Signup /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={session ? <Dashboard session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/create"
          element={session ? <Create session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={session ? <Settings session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/autopilot"
          element={session ? <Autopilot session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/checkout"
          element={session ? <Checkout session={session} /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
