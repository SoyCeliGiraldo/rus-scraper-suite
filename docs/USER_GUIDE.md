# Guía de Usuario

## Probar localmente
1. Instala dependencias:
   - `npm install`
   - `cd client && npm install && npm run build`
2. Arranca el servidor: `npm start`
3. Abre `http://127.0.0.1:3000`.
4. Panel KPI visible en la UI.

## Ejecutar búsquedas
- Amazon/eBay/BrokerBin:
  - POST `/api/v1/amazon-search/run` con `x-api-key` y body `{ "file": "input_parts.csv" }`.

## Descargar facturas
- Subir/usar PDFs de `amazon_invoices/` y POST `/api/v1/amazon-invoices/run` con API Key.

## Variables de entorno
- Configura `API_KEY` y `ALLOWED_ORIGINS`.
- Para persistencia: `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
