// Simple enrichment module (placeholder for future ML/embeddings)
// Provides heuristic best-offer scoring and normalization.

function normalizePrice(raw) {
  if (!raw) return null;
  const p = String(raw).replace(/[^0-9.]/g, '');
  const num = parseFloat(p);
  return Number.isFinite(num) ? num : null;
}

function scoreOffer(offer) {
  // Basic heuristic: lower price, preferred condition = New > Refurbished > Used
  const price = normalizePrice(offer.price || offer.raw_price);
  let conditionWeight = 1;
  const cond = (offer.condition || '').toLowerCase();
  if (cond.includes('new')) conditionWeight = 1.2;
  else if (cond.includes('refurb')) conditionWeight = 1.0;
  else conditionWeight = 0.8;
  if (!price) return 0;
  // Inverse price scaled * condition weight
  return (1000 / (price + 1)) * conditionWeight;
}

function enrichOffers(offers) {
  if (!Array.isArray(offers)) return offers;
  let best = null;
  let bestScore = -Infinity;
  for (const o of offers) {
    const s = scoreOffer(o);
    o._enrichment = { priceNormalized: normalizePrice(o.price || o.raw_price), score: s };
    if (s > bestScore) {
      bestScore = s;
      best = o;
    }
  }
  if (best) best._enrichment.bestOffer = true;
  return offers;
}

module.exports = { enrichOffers, normalizePrice };
