import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function MetricsDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await axios.get('/api/v1/kpi');
      setData(res.data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (error) return <div className="p-4 bg-red-100 text-red-700 rounded">Error KPIs: {error}</div>;
  if (!data) return <div className="p-4 text-sm text-slate-500">Cargando métricas...</div>;

  const cards = [
    { label: 'Jobs totales', value: data.totalJobs },
    { label: 'Jobs en curso', value: data.running },
    { label: 'Jobs terminados', value: data.finished },
    { label: 'Jobs con error', value: data.errors },
    { label: 'Facturas descargadas', value: data.invoicesDownloaded },
  ];

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">KPIs</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
            <div className="text-2xl font-semibold mt-1">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
