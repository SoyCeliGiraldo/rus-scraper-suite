import React, { useEffect, useState } from 'react';
import { fetchAmazonOffers } from '../services/api';

const AmazonOffersComponent = ({ onClose }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAmazonOffers();
        setOffers(data.offers || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-800">Ofertas Amazon</h3>
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 underline">Cerrar</button>
      </div>
      {loading && <div className="text-slate-500">Cargando ofertas...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['part_number','rank','price','raw_price','qty','condition','seller','url','scraped_at'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offers.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-4 text-center text-slate-400">Sin ofertas (NO OFFERS)</td></tr>
              )}
              {offers.map((o,i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-700">{o.part_number}</td>
                  <td className="px-3 py-2">{o.rank}</td>
                  <td className="px-3 py-2">{o.price}</td>
                  <td className="px-3 py-2">{o.raw_price}</td>
                  <td className="px-3 py-2">{o.qty}</td>
                  <td className="px-3 py-2">{o.condition}</td>
                  <td className="px-3 py-2">{o.seller}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate"><a href={o.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">link</a></td>
                  <td className="px-3 py-2 text-xs text-slate-400">{o.scraped_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AmazonOffersComponent;