import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import WorldMap from './WorldMap';
import ReportTable from './ReportTable';
import MarketingMap from './MarketingMap';
import './App.css';

type Tab = 'map' | 'report';
type ReportPeriod = 'daily' | 'monthly' | 'yearly' | 'custom';

interface Status {
  connected: boolean;
  host: string | null;
}

// Main dashboard for authenticated users
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [status, setStatus] = useState<Status | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🌍 MikroTik Geo VPN</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`status-indicator ${status?.connected ? 'connected' : 'disconnected'}`}>
            <span className={`status-dot ${status?.connected ? 'connected' : 'disconnected'}`}></span>
            <span>{status?.connected ? `Connected` : 'Disconnected'}</span>
          </div>
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          World Map
        </button>
        <button
          className={`nav-tab ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          Reports
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'map' ? (
          <WorldMap />
        ) : (
          <ReportTable
            period={reportPeriod}
            setPeriod={setReportPeriod}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public marketing map */}
        <Route path="/public-map" element={<MarketingMap />} />
        
        {/* Login page */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Dashboard onLogout={handleLogout} />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          } 
        />
        
        {/* Main app (protected) */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Dashboard onLogout={handleLogout} />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
