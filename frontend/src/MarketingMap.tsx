import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import './WorldMap.css';

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
        text: 'Global Service Coverage',
        subtext: `Available in ${data.total_countries} Countries Worldwide`,
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
          // Special message for Iran
          if (countryCode === 'IR') {
            return `<div style="padding: 12px 16px;">
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px; color: #FFD700;">${countryName}</div>
              <div style="color: #FFD700; font-size: 13px;">✨ Premium Service Hub</div>
            </div>`;
          }
          return `<div style="padding: 12px 16px;">
            <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${countryName}</div>
            <div style="color: #58a6ff; font-size: 13px;">✓ Service Available</div>
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
            const baseItem = { ...item };
            // Iran gets special dark gold color
            if (item.countryCode === 'IR') {
              baseItem.itemStyle = {
                areaColor: '#B8860B', // Dark gold
                borderColor: '#FFD700',
              };
              baseItem.emphasis = {
                itemStyle: {
                  areaColor: '#FFD700',
                  borderColor: '#FFF',
                },
              };
            }
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
        <h1>🌍 Our Global Presence</h1>
        <p className="marketing-subtitle">
          Trusted by users in <span className="highlight">{data?.total_countries || 0} countries</span> worldwide
        </p>
      </div>
      
      <div className="marketing-stats">
        <div className="stat-badge">
          <span className="stat-icon">🌐</span>
          <span className="stat-text">{data?.total_countries || 0} Countries</span>
        </div>
        <div className="stat-badge">
          <span className="stat-icon">🚀</span>
          <span className="stat-text">Global Coverage</span>
        </div>
        <div className="stat-badge">
          <span className="stat-icon">⭐</span>
          <span className="stat-text">Premium Service</span>
        </div>
      </div>

      <div className="map-container">
        <div id="marketing-world-map" ref={mapRef}></div>
      </div>

      <div className="marketing-footer">
        <p>✨ Experience reliable, high-speed connectivity anywhere in the world</p>
      </div>
    </div>
  );
}
