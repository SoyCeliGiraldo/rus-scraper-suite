# Seguridad

- API Key obligatoria para endpoints críticos (`x-api-key` o `Authorization: Bearer`).
- CORS restringido por `ALLOWED_ORIGINS`.
- Helmet y rate-limiting activos.
- Sanitización de secretos en logs (`src/utils/secrets.js`).
- Descargas limitadas a carpetas whitelisted.

## Recomendaciones
- Rotar `API_KEY` periódicamente.
- Usar `UPSTASH_REDIS_REST_TOKEN` con permisos mínimos.
- En producción usar almacenamiento externo (S3) para archivos grandes.
