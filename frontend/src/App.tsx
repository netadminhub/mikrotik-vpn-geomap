import { useState, useEffect } from 'react';
import WorldMap from './WorldMap';
import ReportTable from './ReportTable';
import './App.css';

type Tab = 'map' | 'report';
type ReportPeriod = 'daily' | 'monthly' | 'yearly' | 'custom';

interface Status {
  connected: boolean;
  host: string | null;
}

function App() {
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
        <div className={`status-indicator ${status?.connected ? 'connected' : 'disconnected'}`}>
          <span className={`status-dot ${status?.connected ? 'connected' : 'disconnected'}`}></span>
          <span>{status?.connected ? `Connected to ${status.host}` : 'Disconnected'}</span>
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

export default App;
