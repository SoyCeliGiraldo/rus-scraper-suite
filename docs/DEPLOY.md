# Despliegue

## Vercel (funciones estándar)
1. Configura variables en el dashboard de Vercel:
   - `API_KEY`
   - `ALLOWED_ORIGINS`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
2. Verifica `vercel.json` (función Node y estáticos `client/dist`).
3. Haz deploy: `vercel deploy` (opcional desde CLI) o push a GitHub conectado.

## Local
- `npm run setup`
- `npm start`
