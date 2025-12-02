import React, { useState, useEffect } from 'react';
import { startAmazonInvoicesJob, getAmazonInvoiceJobStatus, listAmazonInvoices } from '../services/api';

const pollInterval = 3000;

const AmazonInvoicesComponent = () => {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [log, setLog] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({ maxPages: 3, onlyNew: true, amex: false, cardBrand: '', cardLast4: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timer;
    if (jobId && status && status !== 'finished' && status !== 'error') {
      timer = setInterval(async () => {
        try {
          const data = await getAmazonInvoiceJobStatus(jobId);
          setStatus(data.status);
          setLog(data.log || '');
          if (data.status === 'finished') {
            const inv = await listAmazonInvoices();
            setInvoices(inv.invoices || []);
          }
        } catch (e) { /* ignore polling errors */ }
      }, pollInterval);
    }
    return () => timer && clearInterval(timer);
  }, [jobId, status]);

  const startJob = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = { maxPages: form.maxPages, onlyNew: form.onlyNew, amex: form.amex, cardBrand: form.cardBrand, cardLast4: form.cardLast4 };
      const data = await startAmazonInvoicesJob(payload);
      setJobId(data.jobId);
      setStatus(data.status);
      setLog('Job iniciado...');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshInvoices = async () => {
    try {
      const inv = await listAmazonInvoices();
      setInvoices(inv.invoices || []);
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="mt-10">
      <h3 className="text-xl font-bold text-slate-800 mb-4">Descarga de Facturas Amazon</h3>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="md:col-span-1 flex flex-col gap-1">
          <label className="text-xs text-slate-500">Max Pages</label>
          <input type="number" value={form.maxPages} onChange={e => setForm({ ...form, maxPages: parseInt(e.target.value||'0',10) })} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div className="md:col-span-1 flex items-center gap-2 mt-5">
          <input type="checkbox" checked={form.onlyNew} onChange={e => setForm({ ...form, onlyNew: e.target.checked })} />
          <span className="text-sm">Solo nuevos</span>
        </div>
        <div className="md:col-span-1 flex items-center gap-2 mt-5">
          <input type="checkbox" checked={form.amex} onChange={e => setForm({ ...form, amex: e.target.checked })} />
          <span className="text-sm">Filtro Amex</span>
        </div>
        <div className="md:col-span-1 flex flex-col gap-1">
          <label className="text-xs text-slate-500">Card Brand</label>
          <input type="text" value={form.cardBrand} onChange={e => setForm({ ...form, cardBrand: e.target.value })} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div className="md:col-span-1 flex flex-col gap-1">
          <label className="text-xs text-slate-500">Card Last4</label>
          <input type="text" value={form.cardLast4} onChange={e => setForm({ ...form, cardLast4: e.target.value })} className="border rounded px-2 py-1 text-sm" />
        </div>
      </div>
      <button onClick={startJob} disabled={loading || (status && status==='running')} className="px-4 py-2 bg-primary text-white rounded shadow text-sm disabled:opacity-50">
        {loading ? 'Iniciando...' : status==='running' ? 'En progreso...' : 'Iniciar Descarga'}
      </button>
      {jobId && (
        <div className="mt-6 p-4 bg-white border border-slate-200 rounded">
          <div className="flex justify-between mb-2">
            <div className="text-sm font-medium">Job ID: <span className="font-mono text-xs">{jobId}</span></div>
            <div className="text-sm">Estado: <span className="font-semibold">{status}</span></div>
          </div>
          <pre className="text-xs max-h-48 overflow-auto bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap">{log}</pre>
          {status === 'finished' && (
            <div className="mt-4">
              <button onClick={refreshInvoices} className="text-sm underline text-blue-600 mr-3">Refrescar facturas</button>
              <h4 className="font-semibold text-slate-700 mb-2">Facturas descargadas</h4>
              {invoices.length === 0 && <div className="text-xs text-slate-400">(No hay PDFs aún)</div>}
              <ul className="text-sm space-y-1">
                {invoices.map(f => (
                  <li key={f} className="flex items-center justify-between">
                    <span className="font-mono text-xs">{f}</span>
                    <a href={`/api/v1/amazon-invoices/invoices/${f}/download`} className="text-blue-600 underline text-xs" target="_blank" rel="noreferrer">Descargar</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AmazonInvoicesComponent;