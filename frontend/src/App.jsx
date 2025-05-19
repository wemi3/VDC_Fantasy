import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Callback from './pages/auth/Callback';
import Dashboard from './components/Dashboard';
import TeamBuilder from './pages/TeamBuilder';
import NavBar from "./components/NavBar";
import Leaderboard from './pages/Leaderboard';
import TeamPage from './pages/TeamPage';
import { LoadingScreen } from './components/LoadingScreen';

function AppContent() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // You can adjust delay or remove it if you want instant switch
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <>
      {loading && <LoadingScreen message="Loading page..." />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/team-builder" element={<TeamBuilder />} />
        <Route path="/players" element={<TeamBuilder />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/team/:userId" element={<TeamPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <NavBar />
      <AppContent />
    </Router>
  );
}
