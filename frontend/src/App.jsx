import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getSummaryAggregated, getByStatus, getByCustomer, getTopCustomers } from './api';
import './App.css';

const STATUS_COLORS = { open: '#FB923C', closed: '#34D399' };

const tooltipStyle = { background: '#1E293B', border: '1px solid #334155', borderRadius: 6, color: '#E2E8F0' };
const axisTick = { fill: '#94A3B8', fontSize: 12 };

function App() {
  const [summary, setSummary] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [byCustomer, setByCustomer] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryRes, statusRes, customerRes, topRes] = await Promise.all([
          getSummaryAggregated(),
          getByStatus(),
          getByCustomer(),
          getTopCustomers()
        ]);
        setSummary(summaryRes.data);
        setByStatus(statusRes.data.map(item => ({ ...item, total: Number(item.total) })));
        setByCustomer(customerRes.data.slice(0, 8));
        setTopCustomers(topRes.data.slice(0, 8));
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar os dados. Verifique se a API está rodando em http://localhost:3000');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="status-message">Carregando...</div>;
  if (error) return <div className="status-message error">{error}</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Customer Complaint Analytics</h1>
        <span className="live-badge"><span className="live-dot"></span>live</span>
      </div>

      <div className="cards">
        <div className="card">
          <span className="card-label">Total de Reclamações</span>
          <span className="card-value">{summary.total_complaints}</span>
        </div>
        <div className="card open">
          <span className="card-label">Abertas</span>
          <span className="card-value">{summary.open_complaints}</span>
        </div>
        <div className="card closed">
          <span className="card-label">Fechadas</span>
          <span className="card-value">{summary.closed_complaints}</span>
        </div>
      </div>

      <div className="charts">
        <div className="chart-box">
          <h2>Reclamações por Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={byStatus} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={100} label>
                {byStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#38BDF8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h2>Reclamações por Cliente</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byCustomer} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis type="number" stroke="#64748B" tick={axisTick} />
              <YAxis type="category" dataKey="name" stroke="#64748B" tick={axisTick} width={140} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="total" fill="#38BDF8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box full-width">
          <h2>Top Clientes (Reclamações Abertas)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCustomers} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis type="number" stroke="#64748B" tick={axisTick} />
              <YAxis type="category" dataKey="name" stroke="#64748B" tick={axisTick} width={140} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="open_complaints" fill="#FB923C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;