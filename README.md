# Amazon Invoice Bot & BrokerBin Automation

![CI Status](https://github.com/tu-usuario/amazon-invoice-bot/actions/workflows/ci.yml/badge.svg)

Este proyecto es una suite de automatización profesional diseñada para optimizar procesos de descarga de facturas de Amazon y búsqueda de partes en BrokerBin. Desarrollado con Node.js, Express y Playwright, ofrece una arquitectura robusta, segura y escalable.

## 📋 Características

- **Amazon Invoice Scraper**:
  - Descarga automática de facturas en PDF.
  - Soporte para múltiples páginas de historial de pedidos.
  - Filtros avanzados por tarjeta de crédito (ej. American Express) y últimos dígitos.
  - Modo "solo nuevos" para evitar duplicados.
  - Manejo de autenticación manual y persistencia de sesión.

- **BrokerBin Part Searcher**:
  - Búsqueda automatizada de partes desde archivos CSV o Excel.
  - Extracción inteligente de ofertas (Top 15, precios, condiciones).
  - Generación de reportes detallados en CSV.
  - Capturas de pantalla y HTML para auditoría.
  - Soporte para heurística de búsqueda en hojas de cálculo complejas.

- **eBay Part Searcher (Nuevo)**:
  - Búsqueda de partes en eBay.com.
  - Extracción de precios, condiciones y envío.
  - Integrado con la misma arquitectura base.

- **API RESTful**:
  - Endpoints para iniciar tareas de scraping y descargar resultados.
  - Seguridad integrada con Helmet, CORS y Rate Limiting.

## 🚀 Instalación

1.  **Requisitos Previos**:
    - Node.js v18 o superior.
    - npm v9 o superior.

2.  **Clonar y Configurar**:
    ```bash
    git clone <url-del-repo>
    cd amazon-invoice-bot
    npm install
    ```

3.  **Variables de Entorno**:
    Copia el archivo de ejemplo y configura tus credenciales (opcional, también se pueden pasar por CLI).
    ```bash
    cp .env.example .env
    ```
    Edita `.env` con tus datos de BrokerBin si deseas login automático.

## 🛠 Uso

### Servidor API
Para iniciar el servidor web y la API:
```bash
npm start
```
El servidor estará disponible en `http://localhost:3000`.

### CLI: Amazon Invoices
Ejecuta el scraper de Amazon directamente desde la terminal:
```bash
# Descarga básica (20 páginas)
npm run amazon

# Con filtros específicos
node src/services/amazonService.js --amex --only-new --max-pages=5
```

### CLI: BrokerBin Search
Ejecuta la búsqueda de partes:
```bash
# Búsqueda básica
npm run brokerbin -- --file=mis_partes.csv

# Opciones avanzadas
node src/services/brokerbinService.js --file=inventario.xlsx --max-parts=50 --save-html
```

### CLI: eBay Search (Experimental)
Ejecuta la búsqueda de partes en eBay:
```bash
node scripts/runEbaySearch.js --file=mis_partes.csv
```

### Interfaz Web (UI)

1. Ejecuta `npm start` y abre `http://localhost:3000`.
2. Selecciona modo: BrokerBin / Amazon Search / Amazon Facturas.
3. Amazon Search:
  - Sube archivo (.xlsx/.csv)
  - Valida columnas → Procesa → Resultados con enlaces de descarga y tabla de ofertas.
4. Amazon Facturas:
  - Configura parámetros (Max Pages, Solo nuevos, Amex, Brand, Last4)
  - Inicia job → Observa logs en vivo → Al finalizar muestra lista de PDFs descargables.
5. Credenciales nunca se envían al navegador; todo se gestiona en backend con `.env`.
6. Si MFA/CAPTCHA bloquea login, reintenta en modo no headless desde CLI para generar sesión persistente y luego usa la UI.

Limitaciones actuales:
- Jobs en memoria (se pierden al reiniciar).
- Sin paginación en tabla de ofertas (pendiente mejora).
- Sin barra de progreso porcentual exacta (se estima con conteo de facturas guardadas).

## 🏗 Arquitectura

El proyecto sigue una arquitectura modular basada en capas:

- **`src/app.js`**: Configuración de Express y Middleware.
- **`src/controllers/`**: Lógica de control de las rutas API.
- **`src/services/`**: Lógica de negocio y automatización (Playwright).
- **`src/routes/`**: Definición de endpoints API.
- **`src/utils/`**: Utilidades compartidas (Manejo de navegador, logs).
- **`src/config/`**: Gestión centralizada de configuración.

Para más detalles, consulta [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🔒 Seguridad

- **Headers**: Implementación de Helmet para headers HTTP seguros.
- **Rate Limiting**: Protección contra abuso de API.
- **Validación**: Verificación de inputs y manejo de errores robusto.
- **Privacidad**: Las credenciales no se guardan en el código, se usan variables de entorno o inputs seguros.

### Gestión de Credenciales

Todas las variables sensibles y credenciales están documentadas en `docs/CREDENTIALS.md`. Cada cambio que añada, modifique o elimine una variable de entorno debe actualizar ese archivo y agregar una nota en el commit (`docs(credentials):` o `feat(env):`).

Resumen rápido:
- Copia `.env.example` a `.env` y completa valores reales.
- Nunca subas `.env` al repositorio (verifica `.gitignore`).
- Amazon auto-login (búsqueda/facturas) requiere `AMAZON_EMAIL` y `AMAZON_PASSWORD`.
- BrokerBin requiere `BROKERBIN_USER` y `BROKERBIN_PASS` para login automático.
- Rotación recomendada: 90 días.
- Para producción: usar gestor de secretos (AWS SSM, Vault, Doppler, etc.).

Si se detecta un secreto en código, **regenerar** la credencial y purgar el commit si ya está público.

## 🤝 Contribución

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para guías sobre cómo colaborar en este proyecto.

## 📄 Licencia

ISC
