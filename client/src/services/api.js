// Simple fetch helpers for frontend
export async function fetchAmazonOffers() {
  const res = await fetch('/api/v1/amazon-search/offers');
  if (!res.ok) throw new Error('Error obteniendo ofertas Amazon');
  return res.json();
}

export async function startAmazonInvoicesJob(options = {}) {
  const res = await fetch('/api/v1/amazon-invoices/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  if (!res.ok) throw new Error('Error iniciando job facturas');
  return res.json();
}

export async function getAmazonInvoiceJobStatus(jobId) {
  const res = await fetch(`/api/v1/amazon-invoices/jobs/${jobId}`);
  if (!res.ok) throw new Error('Error status job');
  return res.json();
}

export async function listAmazonInvoices() {
  const res = await fetch('/api/v1/amazon-invoices/invoices');
  if (!res.ok) throw new Error('Error listando facturas');
  return res.json();
}