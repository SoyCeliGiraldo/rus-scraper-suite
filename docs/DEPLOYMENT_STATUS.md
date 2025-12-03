# Estado de Deploy y Arquitectura (Amazon Invoice Bot)

Fecha: 2025-12-03
Repositorio: SoyCeliGiraldo/rus-scraper-suite
Proyecto: amazon-invoice-bot (frontend + backend)

## Resumen ejecutivo

Objetivo: Tener frontend Vite (client) y backend Express como serverless (api/index.js) desplegados en Vercel, con persistencia en Redis (Upstash) y sin almacenamiento local en producción.

Estado actual:
- Vercel está configurado mediante `vercel.json` (última versión activa en main) para construir y servir el frontend y la API.
- Persisten errores de deploy cuando Vercel intenta tratar `client/dist` como app con entrypoint de servidor. Se está estabilizando con `@vercel/static-build`.
- La página llegó a mostrarse en blanco bajo configuración `builds + routes` sin build explícito de Vite; se cambió a `@vercel/static-build`.

## Arquitectura técnica

- Backend: Node.js + Express.
  - Punto de entrada serverless: `api/index.js`
  - Express app: `src/app.js` (middlewares: CORS, API key, Helmet, rate-limit; rutas KPI, Amazon, eBay, BrokerBin).
  - Persistencia de jobs: Redis (Upstash) a través de `src/jobs/redisJobStore.js`; fallback en memoria para dev.

- Frontend: React + Vite.
  - Código en `client/`, build a `client/dist`.
  - SPA con fallback a `client/dist/index.html`.

- Seguridad:
  - API Key middleware (`src/middleware/authApiKey.js`).
  - CORS restringido por `ALLOWED_ORIGINS`.
  - Whitelist para descargas.

- Tests:
  - Jest + supertest, parser eBay con cheerio (evita ESM issues con jsdom).

- CI/CD:
  - GitHub Actions para build cliente y tests.
  - Deploy en Vercel mediante Git.

## Configuración de Vercel

Se evaluaron tres configuraciones de `vercel.json`:

1) buildCommand + outputDirectory + rewrites
```
{
  "buildCommand": "npm install && cd client && npm install && npm run build",
  "outputDirectory": "client/dist",
  "cleanUrls": true,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/client/dist/index.html" }
  ]
}
```
Pros: Ejecuta build de Vite y sirve SPA.
Contras: En algunas ejecuciones Vercel intenta buscar entrypoint de servidor dentro de `client/dist` y falla con “No entrypoint found …”.

2) builds + routes (static + node)
```
{
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" },
    { "src": "client/dist/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.js" },
    { "src": "/(.*)", "dest": "client/dist/index.html" }
  ]
}
```
Pros: Publica estáticos sin exigir entrypoint.
Contras: Página en blanco si el build de Vite no corre dentro del proceso de Vercel (necesita que `client/dist` exista con artefactos válidos en tiempo de build).

3) builds con @vercel/static-build + routes (actual)
```
{
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" },
    { "src": "client/package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/client/dist/index.html" }
  ]
}
```
Pros: Ejecuta el build de Vite según `client/package.json` y publica estáticos; evita el error de entrypoint.
Contras: Las Project Settings de Vercel no aplican si `builds` existe (aviso de Vercel), lo cual es esperado.

## Handlers y rutas

- `api/index.js`:
```
const app = require("../src/app");
module.exports = app;
```

- Rutas en `vercel.json` (actual):
  - `/api/(.*)` → `/api/index.js`
  - `/(.*)` → `/client/dist/index.html`

## Variables de entorno (Vercel)

- `API_KEY`: requerida por middleware para endpoints protegidos.
- `ALLOWED_ORIGINS`: para CORS en producción.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: Redis (persistencia de jobs/KPI).

## Logs y problemas conocidos

- Error recurrente: `No entrypoint found in output directory: "client/dist"` bajo config con `outputDirectory`. Mitigado con `@vercel/static-build`.
- Página en blanco: cuando `client/dist` se publica sin que Vite se haya construido dentro del entorno de Vercel. Mitigado al forzar build con `@vercel/static-build`.
- Aviso de Vercel: “Due to `builds` existing ... Project Settings will not apply” — es esperado y no crítico.

## Flujo de despliegue (Git)

1. Commit a `main` en GitHub.
2. Vercel clona y corre `vercel build`.
3. Ejecuta `@vercel/static-build` para `client/package.json` → genera `client/dist`.
4. Publica `client/dist/**` y configura la function `api/index.js`.
5. Rutas aplicadas: API y SPA fallback.

## Comandos recientes (para rastreo)

- "fix(vercel): use @vercel/static-build for client and @vercel/node for API; route SPA to index.html"
- "fix(vercel): revert to builds+routes (@vercel/node + @vercel/static) to avoid entrypoint error"
- "fix(vercel): switch to buildCommand+outputDirectory+rewrites to fix blank page and build Vite"

## Próximos pasos y verificación

1. Confirmar que el deploy actual con `@vercel/static-build` finaliza en estado Ready.
2. Smoke tests:
   - Frontend: abrir `/` y una ruta interna para validar fallback SPA.
   - Backend: GET `/api/v1/kpi` (si público) y un endpoint protegido con `API_KEY`.
3. Si persiste blanco: revisar consola del navegador (404/JS errors), confirmar que los assets están en `client/dist/assets/*` publicados y que las rutas no colisionan con `/api`.
4. Ajustar `.vercelignore` si está excluyendo archivos necesarios para build del cliente (no debería excluir `client/**`).

## Contacto y notas

Este documento sirve como handoff para otra IA/ingeniero: el `vercel.json` actual usa `@vercel/static-build` y rutas SPA; el backend monta Express vía `api/index.js`. Las env vars deben estar configuradas en Vercel. Ejecutar un nuevo commit en `main` dispara el deploy.
