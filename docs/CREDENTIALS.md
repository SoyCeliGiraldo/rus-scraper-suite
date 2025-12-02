# Credenciales y Variables Sensibles

Este documento describe todas las variables de entorno y credenciales utilizadas por el proyecto `amazon-invoice-bot`, su propósito, dónde se consumen y lineamientos para su manejo seguro. Cada modificación relacionada con credenciales debe actualizar este archivo.

## Tabla de Variables

| Variable | Servicio / Módulo | Obligatoria | Descripción | Archivo que la usa |
|----------|-------------------|------------|-------------|--------------------|
| BROKERBIN_USER | BrokerBin Scraper | Sí | Usuario para iniciar sesión en BrokerBin | `src/services/brokerbinService.js` | 
| BROKERBIN_PASS | BrokerBin Scraper | Sí | Password de BrokerBin | `src/services/brokerbinService.js` |
| AMAZON_EMAIL | Amazon Search / Invoices | Recomendado | Email de la cuenta Amazon para auto-login | `src/services/amazonSearchService.js`, `src/services/amazonService.js` (si se habilita auto-login) |
| AMAZON_PASSWORD | Amazon Search / Invoices | Recomendado | Password de Amazon para auto-login | `src/services/amazonSearchService.js`, `src/services/amazonService.js` |
| AMAZON_LOGIN_WAIT_MS | Amazon Search | Opcional | Tiempo de espera para login manual o fallback | `src/services/amazonSearchService.js` |
| AMAZON_HEADLESS | Amazon Search | Opcional | Ejecutar Playwright sin UI | `src/services/amazonSearchService.js` |
| AMAZON_REGION | Amazon Search | Opcional | Código región (com, es, mx) | `src/services/amazonSearchService.js` |
| AMAZON_BUSINESS | Amazon Search | Opcional | Forzar modo business.amazon.com | `src/services/amazonSearchService.js` |
| AMAZON_USER_AGENT | Amazon Search | Opcional | User-Agent personalizado para navegación | `src/services/amazonSearchService.js` |
| AMAZON_INVOICES_AUTO_LOGIN | Amazon Invoices | Opcional | Habilita intento de auto-login facturas | `src/services/amazonService.js` |
| AMAZON_INVOICES_EMAIL | Amazon Invoices | Opcional | Email alternativo si difiere de AMAZON_EMAIL | `src/services/amazonService.js` |
| AMAZON_INVOICES_PASSWORD | Amazon Invoices | Opcional | Password alternativo si difiere | `src/services/amazonService.js` |

## Flujo de Consumo

1. El archivo `.env` es leído al iniciar la aplicación (asegúrate que `dotenv` se cargue en la entrada principal si no existe aún).
2. Los servicios (`brokerbinService`, `amazonSearchService`, `amazonService`) leen variables vía `process.env` al construir sus opciones.
3. Las credenciales nunca deben imprimirse en logs. Solo se registra si se intenta auto-login.

## Lineamientos de Seguridad

- Nunca subir `.env` al repositorio: confirmar que esté en `.gitignore`.
- Rotar contraseñas cada 90 días o ante cualquier sospecha.
- Usar contraseñas únicas (no reutilizar). Considerar un gestor (1Password / Bitwarden).
- En despliegues productivos usar un gestor de secretos (AWS SSM Parameter Store, Hashicorp Vault, Doppler, etc.).
- Evitar credenciales en CI: inyectar secretos como variables protegidas.
- Sanitizar logs: revisar que no se haga `logger.info(this.options.password)` o similar.
- Para MFA/CAPTCHA, implementar detección y no automatizar bypass (respeto a TOS).

## Procedimiento para Agregar o Modificar una Variable

1. Agregarla en `.env.example` con un valor placeholder.
2. Documentarla en esta tabla con descripción y archivo de uso.
3. Actualizar README si afecta comandos CLI.
4. Confirmar que no rompe flujos (ejecutar scripts relevantes).
5. Commits: Mensaje debe incluir `docs(credentials):` o `feat(env):` claro.

## Auto-Login Amazon (Búsqueda & Facturas)

- Search: Usa `AMAZON_EMAIL` y `AMAZON_PASSWORD` si se proporciona la opción `--auto-login` (o está por defecto activada) en el CLI `runAmazonSearch.js`.
- Facturas: Recomendada futura integración (si el archivo se revertió sin auto-login, volver a integrar siguiendo el patrón de `amazonSearchService`). Variables dedicadas permiten separar credenciales si conviene.

## Detección de Problemas

- Si aparecen errores de "MFA" o "CAPTCHA": desactivar auto-login y realizar login manual con más tiempo (`AMAZON_LOGIN_WAIT_MS`).
- Si no se descargan facturas: verificar sesión iniciada (captura de pantalla opcional) y que no esté bloqueada la región.

## Próximos Pasos Recomendados

- Integrar auto-login estable en `amazonService.js` (facturas) nuevamente si se necesita.
- Añadir pruebas unitarias que verifiquen que las opciones nunca exponen la contraseña.
- Implementar un wrapper `getSecret(name)` para centralizar acceso y permitir futura encripción.

## Uso en la Web App

La interfaz web (React) consume endpoints `/api/v1/amazon-search/*` y `/api/v1/amazon-invoices/*`. Ninguna credencial se expone al navegador; el backend utiliza las variables de entorno. Si se agregan nuevos endpoints que requieran parámetros sensibles, deben mantenerse en el backend y jamás enviarse como props desde el cliente.

Flujos UI:
- Amazon Search: subir archivo → validar → procesar → mostrar tabla de ofertas (`/offers`).
- Amazon Facturas: iniciar job (`/run`) → polling estado (`/jobs/:id`) → listar PDFs (`/invoices`).

Advertencia: Jobs en memoria se pierden al reiniciar el servidor; para persistencia usar Redis o base de datos.

---
Última actualización: 2025-11-30
