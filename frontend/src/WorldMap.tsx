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

interface CurrentData {
  countries: CountryData[];
  total_users: number;
  timestamp: string | null;
}

export default function WorldMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CurrentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    async function init() {
      await registerWorldMap();
      fetchData();
    }
    init();
    const interval = setInterval(fetchData, 60000);
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
      const res = await fetch('/api/current');
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
          return `${params.name}<br/>Users: ${params.value || 0}`;
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

    chart.setOption(option);
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
    </div>
  );
}
