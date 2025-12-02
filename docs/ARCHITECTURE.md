# Arquitectura del Sistema

Este documento describe la arquitectura técnica del proyecto de automatización.

## Visión General

El sistema es una aplicación híbrida que funciona como:
1.  **Servidor Web/API**: Para invocar tareas remotamente y descargar resultados.
2.  **CLI (Línea de Comandos)**: Para ejecución directa y programada (cron jobs).

## Diagrama de Componentes

```mermaid
graph TD
    Client[Cliente (Web/CLI)] --> API[API Express Server]
    API --> Controller[Scraper Controller]
    Controller --> ServiceA[Amazon Service]
    Controller --> ServiceB[BrokerBin Service]
    
    ServiceA --> Browser[Browser Factory (Playwright)]
    ServiceB --> Browser
    
    Browser --> Amazon[Amazon.com]
    Browser --> BrokerBin[BrokerBin.com]
    
    ServiceA --> FS[Sistema de Archivos (PDFs)]
    ServiceB --> FS[Sistema de Archivos (CSVs)]
```

## Estructura de Directorios

- **`src/`**: Código fuente.
  - **`app.js`**: Punto de entrada de la aplicación Express.
  - **`server.js`**: Inicialización del servidor HTTP.
  - **`config/`**: Variables de entorno y configuración global.
  - **`controllers/`**: Manejadores de peticiones HTTP. Separa la lógica de transporte de la lógica de negocio.
  - **`services/`**: Lógica de negocio pura. Aquí residen los scripts de automatización. Son agnósticos del transporte (pueden usarse por CLI o API).
  - **`utils/`**: Herramientas comunes (BrowserFactory para instanciar Playwright de forma consistente).
  - **`routes/`**: Definiciones de rutas API.
  - **`middleware/`**: Interceptores para seguridad, logging y manejo de errores.

## Decisiones de Diseño

### Modularidad
Se separó la lógica de scraping (`services`) de la lógica del servidor (`controllers`). Esto permite que los scripts de automatización sean reutilizables y testables independientemente de la interfaz web.

### Manejo de Navegador
Se implementó un `BrowserFactory` para centralizar la configuración de Playwright (User Agent, Viewport, Persistencia de Contexto). Esto asegura consistencia entre los diferentes bots.

### Persistencia
Persistencia de estado de jobs con Redis (Upstash) mediante `src/jobs/redisJobStore.js` y orquestada por `src/jobs/jobRegistry.js`. El almacenamiento de archivos (PDFs/CSVs) se mantiene local en desarrollo y puede migrarse a S3 en producción.

### Validación y Seguridad
- **Helmet**: endurecimiento de cabeceras.
- **Rate Limit**: mitigación de abuso.
- **API Key**: `src/middleware/authApiKey.js` para proteger endpoints sensibles.
- **Validación Joi**: `src/middleware/validators.js` en endpoints `/amazon-invoices/run` y `/amazon-search/run`.
- **CORS**: restringido por `ALLOWED_ORIGINS`.
- **Descargas whitelisted**: ruta `/download` solo desde carpetas permitidas.

### Métricas (KPI)
Ruta `src/routes/kpiRoutes.js` expone métricas de jobs (total, running, finished, errors, invoicesDownloaded) consumidas por el panel UI.

### Despliegue en Vercel
Config `vercel.json` para funciones estándar con `@vercel/node` y servir `client/dist`. Variables: `API_KEY`, `ALLOWED_ORIGINS`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

### Seguridad
- **Helmet**: Protege contra vulnerabilidades web comunes.
- **Rate Limit**: Previene ataques de denegación de servicio.
- **Validación**: Se asegura que los archivos de entrada sean válidos antes de procesar.
