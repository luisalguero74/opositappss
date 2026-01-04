# ❌ ERRORES COMUNES AL SUBIR SUPUESTOS PRÁCTICOS

## 🚫 ERROR 1: Falta la palabra clave "ENUNCIADO"

```
❌ INCORRECTO:
Caso práctico:
María trabaja en una empresa...

✅ CORRECTO:
ENUNCIADO
María trabaja en una empresa...
```

**Solución:** La primera línea con contenido debe ser exactamente `ENUNCIADO` en mayúsculas.

---

## 🚫 ERROR 2: Falta la palabra clave "PREGUNTAS"

```
❌ INCORRECTO:
ENUNCIADO
Texto del caso...

PREGUNTA 1
¿Cuál es...?

✅ CORRECTO:
ENUNCIADO
Texto del caso...

PREGUNTAS

PREGUNTA 1
¿Cuál es...?
```

**Solución:** Debe haber una línea con `PREGUNTAS` antes de las preguntas.

---

## 🚫 ERROR 3: Formato incorrecto de preguntas

```
❌ INCORRECTO:
1. ¿Cuál es la respuesta?
Pregunta número 1:
P1: ¿Cuál es...?

✅ CORRECTO:
PREGUNTA 1
¿Cuál es la respuesta?

o también:

PREGUNTA 1:
¿Cuál es la respuesta?
```

**Solución:** Cada pregunta debe empezar con `PREGUNTA` seguido del número.

---

## 🚫 ERROR 4: Opciones mal formateadas

```
❌ INCORRECTO:
a) Primera opción
a. Primera opción
- A: Primera opción

✅ CORRECTO:
OPCIÓN A: Primera opción
OPCIÓN B: Segunda opción
OPCIÓN C: Tercera opción
OPCIÓN D: Cuarta opción

También válido:
A) Primera opción
B) Segunda opción
C) Tercera opción
D) Cuarta opción
```

**Solución:** Usa `OPCIÓN A:` o simplemente `A)` con las letras en mayúsculas.

---

## 🚫 ERROR 5: Falta opciones (menos de 4)

```
❌ INCORRECTO:
PREGUNTA 1
¿Cuál es...?
OPCIÓN A: Primera
OPCIÓN B: Segunda
OPCIÓN C: Tercera

✅ CORRECTO:
PREGUNTA 1
¿Cuál es...?
OPCIÓN A: Primera
OPCIÓN B: Segunda
OPCIÓN C: Tercera
OPCIÓN D: Cuarta
```

**Solución:** TODAS las preguntas deben tener exactamente 4 opciones (A, B, C, D).

---

## 🚫 ERROR 6: Falta el solucionario

```
❌ INCORRECTO:
ENUNCIADO
...
PREGUNTAS
...
(fin del archivo)

✅ CORRECTO:
ENUNCIADO
...
PREGUNTAS
...
SOLUCIONARIO

PREGUNTA 1: A
Explicación...
```

**Solución:** Debe incluirse `SOLUCIONARIO` seguido de las respuestas.

---

## 🚫 ERROR 7: Formato incorrecto en solucionario

```
❌ INCORRECTO:
SOLUCIONARIO
1. La respuesta es A
Respuesta 1: A
La correcta es la A

✅ CORRECTO:
SOLUCIONARIO

PREGUNTA 1: A
Explicación de por qué A es correcta...

PREGUNTA 2: C
Explicación de por qué C es correcta...
```

**Solución:** Formato exacto `PREGUNTA X: LETRA` seguido de la explicación.

---

## 🚫 ERROR 8: Más de 15 preguntas

```
❌ INCORRECTO:
PREGUNTA 1
...
PREGUNTA 16
...
PREGUNTA 20

✅ CORRECTO:
PREGUNTA 1
...
PREGUNTA 15
(máximo 15 preguntas)
```

**Solución:** El sistema acepta entre 1 y 15 preguntas máximo.

---

## 🚫 ERROR 9: Caracteres especiales o encoding incorrecto

```
❌ INCORRECTO:
Archivo con caracteres raros: � � �
Saltos de línea Windows sin normalizar

✅ CORRECTO:
Guarda el archivo como UTF-8
Usa saltos de línea normales
```

**Solución:** Guarda el archivo en formato UTF-8 sin BOM.

---

## 🚫 ERROR 10: Respuestas sin explicación

```
❌ POCO ÚTIL:
PREGUNTA 1: A

PREGUNTA 2: B

✅ RECOMENDADO:
PREGUNTA 1: A
Según el artículo 194 de la LGSS, la incapacidad permanente total...

PREGUNTA 2: B
De acuerdo con el Real Decreto 1430/2009, artículo 5...
```

**Solución:** Aunque la explicación es opcional, se recomienda incluir motivación técnica/legal.

---

## ✅ PLANTILLA PERFECTA PARA COPIAR

```
ENUNCIADO

[Aquí va todo el texto del caso práctico]

PREGUNTAS

PREGUNTA 1
[Texto de la pregunta]
OPCIÓN A: [Primera opción]
OPCIÓN B: [Segunda opción]
OPCIÓN C: [Tercera opción]
OPCIÓN D: [Cuarta opción]

PREGUNTA 2
[Texto de la pregunta]
OPCIÓN A: [Primera opción]
OPCIÓN B: [Segunda opción]
OPCIÓN C: [Tercera opción]
OPCIÓN D: [Cuarta opción]

SOLUCIONARIO

PREGUNTA 1: A
[Explicación con referencias legales]

PREGUNTA 2: C
[Explicación con referencias legales]
```

---

## 🔧 HERRAMIENTA DE VERIFICACIÓN

Usa el botón **"🔍 Analizar Archivo"** antes de subir para detectar problemas automáticamente.

---

## 💡 CONSEJOS FINALES

1. ✅ Copia primero la plantilla perfecta
2. ✅ Rellena cada sección sin modificar las palabras clave
3. ✅ Asegúrate de que cada pregunta tiene 4 opciones
4. ✅ Verifica que el solucionario tiene todas las respuestas
5. ✅ Usa el analizador antes de enviar
6. ✅ Guarda en formato .txt o .pdf
7. ✅ Si falla, revisa el mensaje de error detallado
