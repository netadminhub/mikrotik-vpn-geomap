import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import './MarketingMap.css';

interface CountryData {
  country: string;
  country_code: string;
  user_count: number;
}

interface MarketingData {
  countries: CountryData[];
  total_countries: number;
  timestamp: string;
}

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

export default function MarketingMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    async function init() {
      await registerWorldMap();
      fetchData();
    }
    init();
    // Poll every 2 minutes for smooth updates (backend handles 2-hour session logic)
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (data && mapRef.current && mapRegistered) {
      initChart();
    }
  }, [data, mapRegistered]);

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
      const res = await fetch('/api/marketing-map');
      if (!res.ok) {
        throw new Error('Failed to load marketing data');
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
      countryCode: c.country_code,
    }));

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: 'Active Users by Country',
        subtext: `${data.total_countries} countries with users online now`,
        left: 'center',
        textStyle: {
          color: '#f0f6fc',
          fontSize: 18,
          fontWeight: 'bold',
        },
        subtextStyle: {
          color: '#8b949e',
          fontSize: 14,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const countryName = params.name;
          const countryCode = params.data?.countryCode;
          const hasUsers = params.value && params.value > 0;
          
          // Only show tooltip for countries with active users
          if (!hasUsers) {
            return '';
          }
          
          // Special message for Iran
          if (countryCode === 'IR') {
            return `<div style="padding: 12px 16px;">
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px; color: #FFD700;">${countryName}</div>
              <div style="color: #FFD700; font-size: 13px;">❤️ Active Users Connected</div>
            </div>`;
          }
          return `<div style="padding: 12px 16px;">
            <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${countryName}</div>
            <div style="color: #58a6ff; font-size: 13px;">✓ Users Connected Now</div>
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
        calculable: false,
        show: false, // Hide the legend for cleaner look
        inRange: {
          color: ['#1a4d2e', '#2d7d46', '#4a9f6d', '#6ec994', '#99f0c2'],
        },
        textStyle: {
          color: '#8b949e',
        },
      },
      series: [
        {
          name: 'Service Coverage',
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
          // Custom styling for specific countries
          data: mapData.map((item: any) => {
            const baseItem = { 
              ...item,
              // Make sure Iran is ALWAYS yellow (not green)
              itemStyle: item.countryCode === 'IR' ? {
                areaColor: '#FFD700', // Yellow - always visible
                borderColor: '#FFA500',
              } : undefined,
              emphasis: item.countryCode === 'IR' ? {
                itemStyle: {
                  areaColor: '#FFC125', // Golden yellow on hover
                  borderColor: '#FFF',
                },
                label: {
                  show: true,
                  color: '#FFF',
                },
              } : {
                itemStyle: {
                  areaColor: '#30363d',
                },
              },
            };
            return baseItem;
          }),
        },
      ],
    };

    chart.setOption(option, { notMerge: false });
  };

  if (loading && !data) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading global coverage map...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="marketing-map-wrapper">
      <div className="marketing-header">
        <h1>NetAdmin Plus Abroad - Live Connection Map</h1>
        <p className="marketing-subtitle">
          Live: Iranians connected right now from {data?.total_countries || 0} countries
        </p>
        <p className="marketing-description">
          Real-time view of active connections. Users currently accessing Iranian banking, government services, and content from around the world.
        </p>
      </div>
      
      <div className="features-compact">
        <div className="feature-item">
          <span className="feature-emoji">🇮🇷</span>
          <span>Iranian IP</span>
        </div>
        <div className="feature-item">
          <span className="feature-emoji">🏦</span>
          <span>Banking</span>
        </div>
        <div className="feature-item">
          <span className="feature-emoji">🔒</span>
          <span>Secure</span>
        </div>
        <div className="feature-item">
          <span className="feature-emoji">💳</span>
          <span>Crypto/PayPal</span>
        </div>
      </div>

      <div className="map-container">
        <div id="marketing-world-map" ref={mapRef}></div>
      </div>

      <div className="live-stats">
        <div className="live-indicator">
          <span className="pulse-dot"></span>
          <span>LIVE</span>
        </div>
        <div className="stat-text">
          <span className="stat-number">{data?.total_countries || 0}</span>
          <span className="stat-label">countries with active users</span>
        </div>
      </div>

      <div className="marketing-footer">
        <div className="footer-content">
          <p className="footer-tagline">
            Built between the pings with ❤️ by <a href="https://instagram.com/ramtiin.ir" target="_blank" rel="noopener noreferrer" className="author-link">Ramtin</a>
          </p>
          <p className="footer-contact">
            Order now: <a href="https://t.me/NetAdminPlus" target="_blank" rel="noopener noreferrer">@NetAdminPlus</a>
          </p>
          <div className="social-links">
            <a
              href="https://instagram.com/netadminplus"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link instagram"
              title="Instagram"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://youtube.com/netadminplus"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link youtube"
              title="YouTube"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a
              href="https://x.com/netadmiinplus"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link twitter"
              title="X (Twitter)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a
              href="https://linkedin.com/in/ramtin-rahmani"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link linkedin"
              title="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
