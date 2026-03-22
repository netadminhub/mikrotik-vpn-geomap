import { useState, useEffect } from 'react';
import './ReportTable.css';

type ReportPeriod = 'daily' | 'monthly' | 'yearly' | 'custom';

interface ReportData {
  country: string;
  country_code: string;
  max_users: number;
  avg_users: number;
  sample_count: number;
}

interface ReportTableProps {
  period: ReportPeriod;
  setPeriod: (period: ReportPeriod) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
}

const countryCodeToFlag = (code: string): string => {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export default function ReportTable({
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: ReportTableProps) {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [period, startDate, endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      let url = '/api/report?';
      if (period !== 'custom') {
        url += `period=${period}`;
      } else if (startDate && endDate) {
        url += `start_date=${startDate}&end_date=${endDate}`;
      }

      const res = await fetch(url, {
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
      setReportData(result.report || []);
    } catch (err) {
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: ReportPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="report-wrapper">
      <div className="table-container">
        <div className="table-header">
          <h2>📊 User Reports by Country</h2>
        </div>

        <div className="report-filters">
          <button
            className={`filter-btn ${period === 'daily' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('daily')}
          >
            Today
          </button>
          <button
            className={`filter-btn ${period === 'monthly' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('monthly')}
          >
            This Month
          </button>
          <button
            className={`filter-btn ${period === 'yearly' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('yearly')}
          >
            This Year
          </button>
          <button
            className={`filter-btn ${period === 'custom' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('custom')}
          >
            Custom Range
          </button>
        </div>

        {period === 'custom' && (
          <div className="date-inputs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onBlur={fetchReport}
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onBlur={fetchReport}
            />
          </div>
        )}

        {loading ? (
          <div className="loading">Loading report...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Country</th>
                <th className="number">Max Users</th>
                <th className="number">Avg Users</th>
                <th className="number">Samples</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    No data available
                  </td>
                </tr>
              ) : (
                reportData.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <span className="country-flag">{countryCodeToFlag(row.country_code)}</span>
                      {row.country}
                    </td>
                    <td className="number">{row.max_users.toLocaleString()}</td>
                    <td className="number">{row.avg_users.toFixed(2)}</td>
                    <td className="number">{row.sample_count.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
