# Idea de app tipo Opositapp para Bomberos (Ayto. Salamanca)

## Planteamiento general

Reutilizar la arquitectura y funcionalidades de Opositapp (temario, tests, simulacros, estadísticas, IA de preguntas, aulas virtuales, etc.) para una nueva oposición: **Cuerpo de Bomberos del Ayuntamiento de Salamanca**.

## Qué haría falta (resumen)

1. **Contenido y normativa específica**
   - Temario oficial de la oposición (bases de convocatoria, BOP/BOE, reglamentos internos, normativa autonómica de Castilla y León, PRL, tráfico, primeros auxilios, incendios, hidráulica, etc.).
   - Biblioteca legal/técnica propia para RAG: PDFs y textos oficiales indexados.
   - Banco inicial de preguntas reales o de academia para “sembrar” el sistema.

2. **Diseño pedagógico**
   - Estructura del temario: bloques (jurídico, técnico, pruebas físicas, psicotécnicos si aplica).
   - Tipos de prueba: test teórico, supuestos prácticos de intervención, simulacros de examen real.
   - Niveles de dificultad y rutas de estudio (básico → avanzado → simulacros).

3. **Adaptación funcional de la app actual**
   - Reutilizar la misma base técnica (Next.js, Prisma, Vercel, GitHub Actions) con:
     - Nuevo "temario bomberos" (tabla de temas propia o con un campo oposición).
     - Nuevos cuestionarios y estadísticas filtrables por oposición.
   - Ajustar los prompts de IA para:
     - Generar preguntas exclusivamente a partir de normativa y manuales de bomberos.
     - Mantener el estándar actual de calidad (citas normativas, explicaciones, equilibrio A/B/C/D).
   - Panel admin con vistas específicas para:
     - Gestión del temario de bomberos.
     - Revisión y publicación de preguntas/cuestionarios de bomberos.

4. **Datos, marca y modelo de negocio**
   - Decidir si será:
     - Un producto aparte (dominio y marca específica para bomberos), o
     - Un "módulo bomberos" dentro de Opositapp actual.
   - Definir precios y posicionamiento (posible ticket más alto por nicho especializado).

5. **Pasos iniciales prácticos**
   - Recopilar y volcar el temario oficial de bomberos a un formato estructurado (similar a TEMARIO_GENERAL/ESPECIFICO actual).
   - Crear los primeros ficheros `TEMA*.json` de prueba (por ejemplo, un tema técnico clave) y cargarlos con el pipeline actual.
   - Diseñar uno o dos prompts de alta calidad específicos de bomberos (como el del Tema 4 de cotización, pero adaptado al dominio).
   - Probar generación IA + revisión humana para un par de temas piloto.

_Nota: este archivo se ha guardado en `opositapp/documentos/idea-app-bomberos-salamanca.md`. Puedes moverlo a tu carpeta "Documentos" del Mac si quieres tenerlo fuera del proyecto._
