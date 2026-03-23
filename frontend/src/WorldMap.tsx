import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import './WorldMap.css';

// Register world map
let mapRegistered = false;
async function registerWorldMap() {
  if (mapRegistered) return;
  try {
    const response = await fetch('/world.json');
    const worldMap = await response.json();
    echarts.registerMap('world', worldMap);
    mapRegistered = true;
  } catch (error) {
    console.error('Failed to load world map:', error);
  }
}

interface CountryData {
  country: string;
  country_code: string;
  user_count: number;
}

interface UserInfo {
  name: string;
  caller_id: string;
  uptime: string;
}

interface CurrentData {
  countries: CountryData[];
  total_users: number;
  timestamp: string | null;
  users_by_country: Record<string, UserInfo[]>;
}

export default function WorldMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CurrentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCountryUsers, setSelectedCountryUsers] = useState<UserInfo[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function init() {
      await registerWorldMap();
      fetchData();
    }
    init();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (data && mapRef.current) {
      initChart();
    }
  }, [data]);

  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
        return;
      }
      
      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const initChart = () => {
    if (!mapRef.current || !data) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(mapRef.current, 'dark');
    }

    const chart = chartInstance.current;

    // Convert country data to map format
    const mapData = data.countries.map((c: CountryData) => ({
      name: c.country,
      value: c.user_count,
    }));

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: 'Active Users by Country',
        left: 'center',
        textStyle: {
          color: '#f0f6fc',
          fontSize: 16,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const countryName = params.name;
          const userCount = params.value || 0;
          return `<div style="padding: 12px 16px;">
            <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${countryName}</div>
            <div style="color: #58a6ff; font-size: 13px;">👥 ${userCount} ${userCount === 1 ? 'User' : 'Users'}</div>
            <div style="color: #8b949e; font-size: 11px; margin-top: 6px;">Click to view details</div>
          </div>`;
        },
        backgroundColor: '#161b22',
        borderColor: '#30363d',
        textStyle: {
          color: '#f0f6fc',
        },
      },
      visualMap: {
        min: 0,
        max: Math.max(...data.countries.map((c: CountryData) => c.user_count), 1),
        left: 'left',
        bottom: '20',
        text: ['High', 'Low'],
        calculable: true,
        inRange: {
          color: ['#1a4d2e', '#2d7d46', '#4a9f6d', '#6ec994', '#99f0c2'],
        },
        textStyle: {
          color: '#8b949e',
        },
      },
      series: [
        {
          name: 'Users',
          type: 'map',
          mapType: 'world',
          roam: true,
          zoom: 1.2,
          label: {
            show: false,
          },
          itemStyle: {
            areaColor: '#21262d',
            borderColor: '#30363d',
          },
          emphasis: {
            label: {
              show: true,
              color: '#f0f6fc',
            },
            itemStyle: {
              areaColor: '#30363d',
            },
          },
          data: mapData,
        },
      ],
    };

    chart.setOption(option, { notMerge: false });

    // Click event handler for country selection
    chart.off('click');
    chart.on('click', (params: any) => {
      if (params.componentType === 'series') {
        const countryName = params.name;
        const users = data.users_by_country[countryName] || [];
        setSelectedCountry(countryName);
        setSelectedCountryUsers(users);
        setSidebarOpen(true);
      }
    });
  };

  if (loading && !data) {
    return <div className="loading">Loading map data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="map-wrapper">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data?.total_users || 0}</div>
          <div className="stat-label">Total Online Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.countries.length || 0}</div>
          <div className="stat-label">Countries</div>
        </div>
      </div>
      <div className="map-container">
        <div id="world-map" ref={mapRef}></div>
      </div>

      {/* Country Details Sidebar */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      <div className={`country-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>{selectedCountry || 'Country Details'}</h2>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="sidebar-content">
          <div className="user-count">
            <span className="count-number">{selectedCountryUsers.length}</span>
            <span className="count-label">{selectedCountryUsers.length === 1 ? 'User' : 'Users'}</span>
          </div>
          {selectedCountryUsers.length > 0 ? (
            <div className="users-list">
              {selectedCountryUsers.map((user, index) => (
                <div key={index} className="user-card">
                  <div className="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-details">
                      <span className="caller-id">📍 {user.caller_id}</span>
                      <span className="uptime">⏱ {user.uptime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-users">
              <p>No users currently online from this country</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
