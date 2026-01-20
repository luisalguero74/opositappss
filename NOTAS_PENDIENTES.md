# Notas pendientes – 16 de enero de 2026

## Estado actual

- TEMA 03
  - TXT listo: `tema03-especifico.txt` (41 preguntas + solucionario).
  - JSON listo para importar en el panel admin: `TEMA 03-ESPECIFICO.json`.

- TEMA 02
  - TXT: `tema02-especifico.txt`.
  - JSON generado: `TEMA 02-ESPECÍFICO.json` con 109 preguntas (el solucionario tiene 118).
  - Quedan ~9 preguntas que el conversor no está detectando todavía (alguna rareza de formato en el TXT).

## Próximo paso recomendado

- Opción 1: rematar TEMA 02 hasta 118/118
  - Localizar qué preguntas no han entrado en el JSON revisando `tema02-especifico.txt`.
  - Ajustar formato (números, A/B/C/D siempre en línea propia) y volver a ejecutar el conversor.

- Opción 2: seguir creando/convirtiendo más temas
  - Reutilizar el flujo: TXT bien formateado → `scripts/convert-test-txt-to-json.mjs` → JSON para importar.
