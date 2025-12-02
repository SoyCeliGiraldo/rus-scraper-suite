# Debug Amazon Search

Guía rápida para diagnosticar por qué salen `NO OFFERS`.

## Variables .env (opcional)
```
AMAZON_HEADLESS=false            # abre el navegador visible
AMAZON_KEEP_OPEN_MS=20000        # mantiene la ventana abierta 20s al final
AMAZON_WAIT_PRICE_MS=6000        # espera adicional para nodos de precio en resultados
AMAZON_LOGIN_WAIT_MS=15000       # tiempo para login manual (captcha/MFA)
AMAZON_REGION=com                # dominio amazon (com, es, de, etc.)
```

## Ejecución directa
```
node src/services/amazonSearchService.js \
  --file=uploads/parts.csv \
  --save-html=true \
  --offers-limit=5 \
  --offlineParseFallback=true \
  --waitPriceMs=6000 \
  --headless=false \
  --keep-open=15000
```

## Checklist visual
1. ¿Página cargó sin captcha? Si aparece captcha, resuélvelo y espera.
2. Verifica que aparecen tarjetas con títulos dentro de `h2 a span`.
3. Usa DevTools y busca `.a-price .a-offscreen` y `span.a-price-whole`.
4. Si hay precios pero no se capturan, incrementa `AMAZON_WAIT_PRICE_MS`.
5. Si el primer intento da `NO OFFERS`, revisa el HTML en `amazon_search_output/result-<part>.html`.

## Fallback offline
Si `--save-html=true` y no hubo ofertas en vivo:
- El servicio intenta parsear el archivo HTML con cheerio.
- Si encuentra precios se añaden al CSV como ofertas normales.

## Archivos de salida
- `amazon_search_output/amazon_results.csv`: títulos de páginas visitadas.
- `amazon_search_output/amazon_offers_detailed.csv`: ofertas (o NO OFFERS).
- `amazon_search_output/amazon_offers_detailed.json`: JSON equivalente.
- `amazon_search_output/result-<part>.html`: HTML crudo de la búsqueda.

## Ajustes finos
- Aumentar scroll: (pendiente) parámetro futuro `--scroll-steps`.
- Parsear rangos de precio: se agregará a extracción en vivo.
- Etiquetas Sponsored / Prime: se planea añadir campos `is_sponsored` y `is_prime`.

## Errores comunes
| Síntoma | Causa posible | Acción |
|--------|---------------|--------|
| NO OFFERS pero HTML tiene precios | Espera insuficiente / lazy load | Incrementar `waitPriceMs` o usar offline fallback |
| Siempre captcha | Frecuencia alta / patrón detectado | Reduce velocidad: subir `delayMs` |
| Precios con símbolos raros | Unicode NBSP | Normalizar reemplazando `\u00A0` por espacio |

## Próximos pasos
- Integrar extracción en vivo de rangos y Sponsored.
- Añadir script para reprocesar todos los HTML acumulados.

