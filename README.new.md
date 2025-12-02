````markdown
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
  - Extracción inteligente de ofertas (Top 3, precios, condiciones).
  - Generación de reportes detallados en CSV.
  - Capturas de pantalla y HTML para auditoría.
  - Soporte para heurística de búsqueda en hojas de cálculo complejas.

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

### CLI: Amazon Product Search (Ofertas)
Genera ofertas de productos en Amazon con formato idéntico al de BrokerBin.

Salidas:
- `amazon_search_output/amazon_offers_detailed.csv`
- `amazon_search_output/amazon_offers_detailed.json`
- HTML y PNG por parte (si activas `--save-html` / `--save-screenshot`).

```bash
# Búsqueda básica
npm run amazon-search -- --file=mis_partes.csv --max-parts=20 --offers-limit=3

# Con login automático y modo visible
npm run amazon-search -- \
  --file=mis_partes.csv \
  --max-parts=30 \
  --offers-limit=5 \
  --auto-login \
  --login-wait=12000 \
  --headless=false \
  --save-html \
  --save-screenshot

# Región distinta y Business
npm run amazon-search -- \
  --file=mis_partes.csv \
  --region=es \
  --business \
  --auto-login
```

Flags soportados:
- `--file=PATH` Archivo CSV/XLS/XLSX de entrada.
- `--max-parts=N` Limita número de partes procesadas.
- `--offers-limit=N` Máximo de ofertas por parte.
- `--delay-ms=MS` Espera entre partes.
- `--save-html` Guarda HTML de cada búsqueda.
- `--save-screenshot` Captura screenshot.
- `--auto-login` Login automático con credenciales del `.env`.
- `--login-wait=MS` Tiempo para resolver CAPTCHA/MFA manual.
- `--headless=false` Ejecuta con navegador visible.
- `--region=com|es|mx|...` Cambia el dominio base.
- `--business` Usa dominio Business.
- `--user-agent="UA"` Sobrescribe user-agent.

Variables de entorno Amazon (`.env`):
```
AMAZON_EMAIL=tu_correo_amazon
AMAZON_PASSWORD=tu_password_amazon
AMAZON_LOGIN_WAIT_MS=10000
AMAZON_HEADLESS=true
AMAZON_REGION=com
AMAZON_BUSINESS=false
AMAZON_USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
```

Formato columnas de salida (igual BrokerBin):
`part,rank,company,price,raw_price,is_call,qty,condition,manufacturer,location,age,description,page_url,timestamp`

Notas:
- Algunos campos pueden quedar vacíos (qty, manufacturer, location, age).
- Se genera `NO OFFERS` si no se detecta precio.
- En caso de CAPTCHA/MFA se espera `AMAZON_LOGIN_WAIT_MS`.

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

## 🤝 Contribución

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para guías sobre cómo colaborar en este proyecto.

## 📄 Licencia

ISC

````