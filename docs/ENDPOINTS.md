# ENDPOINTS

Base: `/api/v1`

- `GET /kpi`
  - Responde métricas: totalJobs, running, finished, errors, invoicesDownloaded.
  - Auth: no requerido.

- `POST /amazon-invoices/run`
  - Ejecuta flujo de descarga/parseo de facturas.
  - Auth: requerido `x-api-key: <API_KEY>`.
  - Body (JSON): `{ files: string[] }` o usar archivos subidos previamente.

- `POST /amazon-search/run`
  - Ejecuta búsqueda de partes en Amazon/eBay/BrokerBin.
  - Auth: requerido `x-api-key`.
  - Body ejemplo:
    ```json
    { "file": "input_parts.csv", "offersLimit": 15, "aiEnrichment": true }
    ```

- `GET /download/<path>`
  - Descarga archivos desde carpetas whitelisted (e.g. `amazon_invoices`).
  - Auth: según configuración de CORS; se recomienda usar API Key si se expone.
