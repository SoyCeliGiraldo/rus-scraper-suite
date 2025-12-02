# Amazon Invoice Bot

Automatiza descarga de facturas de Amazon y búsqueda de partes en eBay y BrokerBin. Backend Express listo para Vercel (funciones estándar) y persistencia en Redis (Upstash).

## Características
- Descarga y parseo de facturas de Amazon.
- Búsqueda y extracción de ofertas (eBay/BrokerBin).
- Persistencia de jobs en Redis (Upstash) con métricas KPI.
- Seguridad: API Key, CORS, rate limiting, Helmet.
- Validación con Joi.
- Frontend React/Vite con panel de métricas.

## Requisitos
- Node.js 18+.
- Redis Upstash (variables: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN).
- API_KEY para proteger endpoints.

## Scripts
- `npm start`: inicia el servidor.
- `npm run dev:all`: backend + frontend en desarrollo.
- `npm test`: corre pruebas unitarias e integración.
- `npm run build`: compila el frontend.

## Variables de entorno
- `API_KEY` (requerida en producción).
- `ALLOWED_ORIGINS`: lista separada por comas.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
