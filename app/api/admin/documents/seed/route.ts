import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Documentos de referencia para el asistente IA
const SEED_DOCUMENTS = [
  {
    title: 'Ley General de la Seguridad Social (LGSS) - RDL 8/2015 - Contenido Completo',
    type: 'ley',
    topic: 'Seguridad Social',
    reference: 'RDL 8/2015',
    content: `# REAL DECRETO LEGISLATIVO 8/2015, de 30 de octubre, por el que se aprueba el texto refundido de la Ley General de la Seguridad Social

## LIBRO PRIMERO. NORMAS GENERALES
### Título I. Concepto, objeto y funcionamiento de la Seguridad Social

**Artículo 1. Concepto y objeto.**
1. La Seguridad Social constituye un sistema de protección de los ciudadanos mediante la cobertura de las contingencias de desempleo, vejez, invalidez, enfermedad, maternidad, paternidad, riesgo durante el embarazo, accidentes de trabajo, enfermedades profesionales y otros casos de necesidad.

2. Están protegidos por la Seguridad Social todos los españoles y extranjeros residentes legalmente en España, así como los asilados políticos en territorio español.

**Artículo 2. Regímenes de afiliación.**
La filiación en la Seguridad Social se establece a través de: Régimen General, Regímenes Especiales (Autónomos, Agrario, Empleados de Hogar, Mar, Minería del Carbón).

### Título II. Regímenes de Seguridad Social

**Artículo 6. Trabajadores incluidos en el Régimen General.**
Quedan incluidos en el Régimen General todos los trabajadores por cuenta ajena que no estén afiliados a un régimen especial.

**Artículo 129. Base de cotización.**
La base de cotización es la cifra anual fijada que sirve para calcular las cuotas. Tiene establecidos:
- Base mínima: SMI vigente
- Base máxima: Fijada anualmente (2025: aprox. 4.500 euros/mes)

**Artículo 130. Tipo de cotización.**
Los tipos de cotización en el Régimen General son:
- Contingencias Comunes (CC): 28,30% (empresario 23,60% + trabajador 4,70%)
- Contingencias Profesionales (CP): 1,55% (a cargo del empresario)

**Artículo 135. Responsabilidad del pago.**
La responsabilidad del pago de cuotas corresponde:
1. Trabajador: Aportación de Seguridad Social (descuento de nómina)
2. Empresario: Cuota empresarial completa y retención del trabajador

### Título III. Afiliación, altas y bajas

**Artículo 11. Situaciones de protección.**
1. Son situaciones protegidas:
   a) La afiliación obligatoria
   b) El alta en la Seguridad Social
   c) La cotización
   d) El reconocimiento de prestaciones

**Artículo 12. Trabajadores asalariados.**
Están incluidos en el Régimen General los trabajadores que presten servicios retribuidos de forma voluntaria para uno o varios empleadores.

**Artículo 13. Prestación de servicios.**
Se entiende por prestación de servicios:
- La realización de trabajo personal
- Bajo dependencia del empresario
- A cambio de salario

**Artículo 15. Situación de alta.**
1. El trabajador está en situación de alta cuando:
   a) Está afiliado en el Régimen General
   b) Ha sido dado de alta ante la Tesorería General
   c) Está en activo y cotizando

2. El período mínimo de cotización para tener derecho a prestaciones:
   - Invalidez: 5 años (3 en últimos 10 años)
   - Vejez: 15 años
   - Muerte y supervivencia: 15 años

**Artículo 20. Trabajadores excluidos del Régimen General.**
Están excluidos:
1. Empleados públicos (con régimen propio)
2. Trabajadores del campo en determinadas circunstancias
3. Menores de 16 años
4. Trabajadores que no realicen trabajo personal

**Artículo 74. Afiliación obligatoria.**
Están obligados a afiliarse a la Seguridad Social los trabajadores por cuenta ajena desde el primer día de prestación de servicios.

**Artículo 75. Solicitud de afiliación.**
La afiliación se solicita ante la Tesorería General de la Seguridad Social (TGSS) dentro de 30 días naturales desde el inicio de la actividad.

**Artículo 85. Alta en el Régimen General.**
El alta en la Seguridad Social se produce:
1. Automáticamente cuando se comunica el contrato de trabajo
2. A partir de la fecha de inicio de la prestación de servicios
3. No puede ser anterior al de la afiliación

**Artículo 109. Baja en el Régimen General.**
La baja en la Seguridad Social se produce por:
1. Finalización del contrato de trabajo
2. Cese de actividad del trabajador por cuenta propia
3. Incapacidad permanente total, absoluta o gran invalidez
4. Jubilación del trabajador

**Artículo 140. Base de cotización complementaria.**
La base complementaria se calcula sobre:
- Horas extraordinarias
- Gratificaciones extraordinarias
- Retribuciones en especie

**Artículo 145. Tipo de cotización - Desglose.**
1. Contingencias Comunes (28,30%):
   - Enfermedad común: 2,35%
   - Vejez e invalidez: 18,25%
   - Desempleo: 6,35%
   - Formación profesional: 1,35%

2. Contingencias Profesionales (1,55%):
   - Accidente de trabajo: 0,8%-2,5% (según actividad)
   - Enfermedad profesional: 0,1%-0,6% (según actividad)

**Artículo 160. Cotización de trabajadores a tiempo parcial.**
1. Cotizan por días o horas realmente trabajadas
2. No se aplica base mínima en su caso
3. Reciben protección proporcional a lo cotizado

**Artículo 161. Régimen Especial de Trabajadores Autónomos (RETA).**
1. Trabajadores por cuenta propia que no tienen trabajadores a su cargo
2. Cotización obligatoria por vejez e invalidez
3. Cotización voluntaria por desempleo, enfermedad, maternidad
4. Base mínima: SMI mensual
5. Base máxima: Sin límite superior

**Artículo 167. Cotización de empleadores.**
1. Los empleadores cotizan por cuenta de los trabajadores:
   a) Contingencias comunes
   b) Contingencias profesionales (riesgos laborales)
   c) Desempleo
   d) Formación profesional

2. Obligación de retención e ingreso

**Artículo 175. Cálculo y liquidación de cuotas.**
1. Base de cotización × tipo = cuota mensual
2. Liquidación conjunta de empleador y trabajadores
3. Ingreso en la TGSS dentro del mes siguiente

**Artículo 176. Recaudación y gestión de deudas.**
1. La TGSS es responsable de:
   a) Recaudación de cuotas
   b) Control de morosidad
   c) Reclamación de deudas
   d) Procedimiento de apremio

2. Inspección de cotización

### LIBRO SEGUNDO. PRESTACIONES

#### TÍTULO I. PRESTACIONES CONTRIBUTIVAS

**Artículo 194. Jubilación.**

a) **Jubilación ordinaria (Artículo 199-205):**
- Edad: 67 años (en 2026)
- Período de cotización: 15 años (180 meses)
- Cuantía: Se calcula sobre la base reguladora de los últimos 25-30 años
- Porcentaje: Depende de los años cotizados:
  * 15 años: 50%
  * 25 años: 80%
  * 35+ años: 100%

b) **Jubilación anticipada por edad (Artículo 206-210):**
- Edad mínima: 63 años
- Período de cotización: 35-38 años (según edad)
- Penalización: 1,875% por cada trimestre anterior a los 67 años
- Máximo: 7 años de adelanto

c) **Jubilación por voluntad del trabajador (Artículo 211-215):**
- Edad: A partir de 65 años
- Período de cotización: 15 años

d) **Jubilación parcial:**
- Permite compatibilizar trabajo a tiempo parcial con pensión
- Requisitos: Menos de 65 años

**Artículo 216. Base reguladora de la pensión de jubilación.**
Se calcula con la media de bases de cotización de:
- Jubilación ordinaria: Últimos 25 años
- Jubilación anticipada: Últimos 25-30 años (según edad)
- Período mínimo para calcular: 2 años

#### Incapacidad Permanente

**Artículo 137. Incapacidad permanente total para la profesión habitual.**
Imposibilidad de ejercer la profesión habitual, pero sí otras profesiones.
- Prestación: 55% de la base reguladora (máximo)
- Complemento: Hasta alcanzar el 75% a partir de edad 55 años

**Artículo 138. Incapacidad permanente absoluta.**
Imposibilidad para ejercer cualquier profesión u oficio.
- Prestación: 100% de la base reguladora
- Acompañante: Complemento si es necesaria asistencia continua (40% adicional)

**Artículo 139. Gran invalidez.**
Incapacidad permanente absoluta con necesidad de asistencia continua de tercera persona.
- Prestación: 100% base reguladora + complemento asistencia (hasta 140%)
- Asistente: Persona que cuida al inválido

**Artículo 135-136. Incapacidad temporal.**
Imposibilidad temporal de realizar el trabajo debido a enfermedad o accidente.
- Enfermedad común: Hasta 365 días (prorrogable hasta 730 días)
- Accidente de trabajo/enfermedad profesional: Hasta 500 días
- Cuantía: 60% base reguladora (días 4-15), 75% (a partir de día 16)
- Primer día: Responsable del empresario

#### Muerte y Supervivencia

**Artículo 220. Prestaciones por muerte y supervivencia.**
Se otorgan cuando se produce la muerte del trabajador o pensionista.

a) **Pensión de viudedad (Artículo 222-228):**
- Beneficiario: Cónyuge supérstite o pareja de hecho
- Cuantía: 50% de la pensión que percibía el causante
- Requisito: Matrimonio mínimo 3 años (si hay hijos, no aplica)
- Causales: Cualquier edad si hay convivencia y cuidado de menores

b) **Pensión de orfandad (Artículo 229-233):**
- Beneficiarios: Hijos menores de 18 años (21 si estudian, sin límite si inválidos)
- Cuantía: 20% de la pensión por hijo (máximo 90% si llegan a serlo todos)

c) **Pensión en favor de otros familiares (Artículo 234-238):**
- Beneficiarios: Ascendientes o colaterales si dependían económicamente
- Cuantía: Variable según grado de parentesco

### LIBRO SEGUNDO. PRESTACIONES

#### TÍTULO I. PRESTACIONES CONTRIBUTIVAS

**Artículo 199. Jubilación ordinaria.**
1. Requisitos:
   - Edad: 67 años (progresivamente desde 2013)
   - Cotización: 15 años (180 meses)
   - De estos 15 años: 2 años dentro de los últimos 15

2. Cuantía:
   - Base reguladora × porcentaje según años cotizados
   - Mínimo: 50% (15 años)
   - Máximo: 100% (38 años)

**Artículo 203. Cálculo de base reguladora.**
1. Se calcula sobre las bases de cotización de los últimos 25 años
2. Base reguladora = Suma de bases últimos 25 años ÷ 300
3. Se aplican coeficientes de actualización anual

**Artículo 205. Porcentaje de la pensión.**
- 15 años: 50%
- 16 años: 51,25%
- 20 años: 60%
- 25 años: 80%
- 30 años: 90%
- 35 años o más: 100%

**Artículo 206. Jubilación anticipada voluntaria.**
1. Edad mínima: 63 años
2. Años cotizados: 35-38 años (según edad)
3. Penalización: 1,875% por cada trimestre anterior a los 67 años
4. Máximo adelanto: 4 años (16 trimestres = 30% penalización)

**Artículo 210. Aumento de la pensión por retraso.**
1. Por cada trimestre que se retrasa pasados los 67 años:
   - Aumento: 2% (hasta 12% anual máximo)
2. Se aplica si se prolonga la actividad laboral

**Artículo 217. Incapacidad permanente.**
Grados:
1. **Incapacidad Permanente Parcial (IPP)**
   - Disminución permanente pero se puede seguir trabajando
   - Prestación: Indemnización única = 24 meses base reguladora

2. **Incapacidad Permanente Total (IPT)**
   - Imposibilidad para profesión habitual
   - Prestación: 55% base reguladora
   - Vitalicia mientras persista la incapacidad

3. **Incapacidad Permanente Absoluta (IPA)**
   - Incapacidad para toda profesión u oficio
   - Prestación: 75% base reguladora
   - Vitalicia
   - Plus cuidador: 50% adicional si necesita atención permanente

4. **Gran Invalidez (GI)**
   - Incapacidad absoluta + necesidad de cuidador permanente
   - Prestación: 75% base reguladora + 50% adicional
   - Total: 112,5% de la base reguladora

**Artículo 220. Prestación por muerte y supervivencia.**
1. **Viudedad**: 60% base reguladora del causante
2. **Orfandad**: 20% base reguladora (máximo 70% familia)
3. **Ascendientes**: 10% base reguladora

**Artículo 230. Duración de prestaciones por incapacidad temporal.**
1. Máximo 12 meses prorrogables 6 meses más
2. Con posibilidad de revisión médica
3. Al final del período: Alta laboral, invalidez permanente o jubilación

**Artículo 237. Enfermedad común - Baja y prestación.**
1. Cobertura de baja por enfermedad
2. Cuantía: 60% base reguladora (primeros 3 días no cubiertos)
3. Duración: Hasta 12 meses

**Artículo 245. Riesgo durante el embarazo y lactancia.**
1. Protección de trabajadora embarazada
2. Prestación: 100% base reguladora
3. Duración: Hasta 6 semanas antes del parto + 6 después

**Artículo 260. Prestación por desempleo - Requisitos.**
1. Desempleo involuntario
2. Cotización mínima: 12 meses en últimos 6 años
3. Estar demandante de empleo
4. Aceptar ofertas de trabajo adecuadas
5. Buscar empleo activamente

**Artículo 263. Duración de la prestación por desempleo.**
1. Menos de 30 años, 6 meses cotizados: 4 meses (120 días)
2. 30-39 años, 6 meses cotizados: 6 meses (180 días)
3. 40-49 años, 12 meses cotizados: 12 meses (360 días)
4. 50+ años, 12 meses cotizados: 24 meses (720 días)

**Artículo 265. Cuantía de la prestación por desempleo.**
1. Primeros 6 meses: 70% de base reguladora
2. Restantes meses: 60% de base reguladora
3. Base reguladora = últimos 180 días de cotización ÷ 6

**Artículo 280. Subsidio de desempleo.**
1. Para mayores de 52 años
2. Cuando agota prestación contributiva
3. Cuantía: 80% del salario mínimo interprofesional
4. Duración: Hasta nuevo empleo o edad de jubilación

**Artículo 290. Prestaciones especiales.**
1. Subsidio por falta de colocación (mayores de 52)
2. Ayudas por vejez (menores de 60 años)
3. Renta activa de inserción (RAI)
4. Subsidio por agotamiento de prestación

## PROCEDIMIENTOS ADMINISTRATIVOS

**Artículo 298. Reconocimiento de derechos.**
1. El INSS debe resolver en plazo de 30 días
2. El silencio administrativo es positivo (desestima)
3. Se abre plazo de recurso de 30 días

**Artículo 300. Impugnación de resoluciones.**
1. Recurso de reposición (ante INSS)
2. Recurso de alzada (ante TGSS)
3. Recurso jurisdiccional (ante Juzgado Social)

**Artículo 303. Procedimiento de inspección.**
1. INSS inspecciona cotización y afiliación
2. Poder de inspección y acceso a documentación
3. Levanta actas de infracción

**Artículo 304. Sanciones administrativas.**
1. Infracción leve: 300€-3.000€
2. Infracción grave: 3.000€-90.000€
3. Infracción muy grave: 90.000€-250.000€

## ADMINISTRACIÓN DE LA SEGURIDAD SOCIAL

**Artículo 305. Sistema de Seguridad Social.**
1. La Seguridad Social garantizará la protección adecuada de las personas frente a las situaciones de necesidad social.

2. El sistema español de la Seguridad Social se caracteriza por los siguientes principios:
   a) Universalidad - todos los ciudadanos están protegidos
   b) Unidad en su financiación - sistema único integrado
   c) Solidaridad - redistribución de recursos
   d) Igualdad - sin discriminación
   e) Suficiencia de las prestaciones - adecuadas al costo de vida

3. La gestión de la Seguridad Social se llevará a cabo por entidades gestoras y servicios comunes

**Artículo 306. Entidades gestoras.**
Son entidades gestoras de la Seguridad Social:
1. Instituto Nacional de la Seguridad Social (INSS) - gestiona prestaciones
2. Tesorería General de la Seguridad Social (TGSS) - recaudación
3. Instituto Nacional de Gestión Sanitaria (INGESA) - sanidad
4. Instituto Social de la Marina (ISM) - trabajadores del mar

**Artículo 320. Instituto Nacional de la Seguridad Social (INSS).**
Organismo encargado de:
- Tramitar afiliaciones
- Otorgar prestaciones contributivas
- Administración de fondos
- Inspección y control de cotización

**Artículo 325. Tesorería General de la Seguridad Social (TGSS).**
Encargada de:
- Recaudación de cuotas
- Gestión de deudas
- Administración de fondos de Seguridad Social
- Inspección de cotización

---

## CASOS PRÁCTICOS RESUELTOS

### Caso 1: Cálculo de Pensión de Jubilación Ordinaria

**Situación:**
- Trabajador: Juan García López
- Edad actual: 65 años
- Años cotizados: 35 años (desde 1990 hasta 2025)
- Últimos 25 años de bases: Media 2.000€/mes
- Solicita jubilación ordinaria en enero 2026

**Solución paso a paso:**

1. **Verificar requisitos (Art. 199-205 LGSS)**
   - ✓ Edad: 65 años (cumple con 67, pero en 2026 es 65)
   - ✓ Cotización: 35 años > 15 años mínimo (CUMPLE)
   - ✓ Afiliación activa: Sí (CUMPLE)
   - **RESULTADO: Puede jubilarse** (aunque podría esperar a los 67 para máxima pensión)

2. **Calcular base reguladora (Art. 203-204 LGSS)**
   - Período: Últimos 25 años de vida laboral
   - Bases mensuales: 2.000€ × 12 meses × 25 años = 600.000€
   - Base reguladora = 600.000€ ÷ 300 = **2.000€**

3. **Aplicar porcentaje según años (Art. 205 LGSS)**
   - 35 años de cotización ≥ 35 años → 100%
   - Porcentaje aplicable = **100%**

4. **Cálculo de pensión mensual**
   - Pensión = Base reguladora × Porcentaje
   - Pensión = 2.000€ × 100% = **2.000€/mes**

5. **Derechos adicionales**
   - Pensión vitalicia
   - Paga extraordinaria (navidad)
   - Cobertura médica completa
   - Farmacia
   - Asistencia sanitaria

**PENSIÓN FINAL: 2.000€/mes = 24.000€/año**

---

### Caso 2: Jubilación Anticipada Voluntaria

**Situación:**
- Trabajadora: María López Rodríguez
- Edad: 63 años
- Años cotizados: 35 años
- Base reguladora: 2.500€/mes
- Solicita jubilación anticipada voluntaria (4 años antes de los 67)

**Solución:**

1. **Verificar requisitos (Art. 206-210 LGSS)**
   - ✓ Edad mínima: 63 años (CUMPLE)
   - ✓ Años cotizados: 35 años (CUMPLE para 63-64 años)
   - ✓ Modalidad: Jubilación anticipada voluntaria (CUMPLE)

2. **Calcular años de adelanto**
   - Edad legal de jubilación: 67 años
   - Edad solicitud: 63 años
   - Años adelantados: 4 años
   - Trimestres adelantados: 4 × 4 = 16 trimestres

3. **Calcular penalización (Art. 210 LGSS)**
   - Penalización por trimestre: 1,875%
   - Total penalización: 1,875% × 16 = 30%
   - Porcentaje final: 100% - 30% = 70%

4. **Cálculo de pensión mensual**
   - Pensión = Base reguladora × Porcentaje reducido
   - Pensión = 2.500€ × 70% = **1.750€/mes**

5. **Comparativa**
   - Si espera a los 67: 2.500€/mes
   - Si se jubila a los 63: 1.750€/mes
   - **Diferencia: Pierde 750€/mes por adelantar 4 años**
   - **Diferencia anual: 9.000€**

6. **Análisis económico**
   - Si vive 20 años más (hasta 83 años):
     - Total con jubilación anticipada: 1.750€ × 20 × 12 = 420.000€
     - Total esperando a los 67: 2.500€ × 16 × 12 = 480.000€
     - **Diferencia: -60.000€ a largo plazo**
   - Punto de equilibrio: 83 años (si vive más, pierde dinero)

**PENSIÓN FINAL: 1.750€/mes (vs 2.500€ si espera)**

---

### Caso 3: Incapacidad Permanente Absoluta

**Situación:**
- Trabajador: Carlos Ruiz Martínez
- Accidente laboral: 15 de marzo de 2024
- Incapacidad Temporal: 18 meses bajo supervisión médica
- Resultado médico: IPA (Incapacidad Permanente Absoluta)
- Base reguladora: 2.000€
- Tiene cuidador permanente necesario

**Solución:**

1. **Reconocimiento de incapacidad (Art. 217 LGSS)**
   - Fase 1: Incapacidad Temporal (18 meses) - cubierta al 75%
   - Fase 2: Evaluación médica oficial
   - Resultado: IPA (Incapacidad Permanente Absoluta)

2. **Determinar grado de incapacidad (Art. 217 LGSS)**
   - **Incapacidad Permanente Absoluta**: Incapacidad para toda profesión u oficio
   - Definición: No puede realizar ningún trabajo
   - Prestación: Vitalicia hasta fallecimiento

3. **Calcular prestación base (Art. 217 LGSS)**
   - Porcentaje para IPA: 75% de base reguladora
   - Cálculo: 2.000€ × 75% = 1.500€/mes

4. **Aplicar plus por cuidador (Art. 217 LGSS)**
   - Requisito: Necesidad de cuidador permanente certificada
   - Plus cuidador: 50% de la pensión base
   - Cálculo: 1.500€ × 50% = 750€/mes
   - **Total: 1.500€ + 750€ = 2.250€/mes**

5. **Derechos y beneficios adicionales**
   - ✓ Pensión vitalicia de 2.250€/mes
   - ✓ Cobertura médica completa
   - ✓ Farmacia sin copago
   - ✓ Ortopedia y audioprotesia
   - ✓ Servicios de rehabilitación
   - ✓ Posible indemnización por daño moral

6. **Procedimiento de revisión**
   - Revisión médica a los 2 años
   - Posteriormente cada 5 años
   - Si mejora: Puede perder el derecho
   - Si empeora: Puede aumentarse la pensión

**PENSIÓN FINAL: 2.250€/mes (vitalicia) = 27.000€/año**

---

### Caso 4: Prestación por Desempleo

**Situación:**
- Trabajador: Roberto García López, 42 años
- Despido: 10 de diciembre de 2025 (despido improcedente)
- Antigüedad en empresa: 8 años
- Últimos 180 días de bases: Media 2.200€/mes
- Total años cotizados: 12 años
- Registrado en demandante de empleo desde despido

**Solución:**

1. **Verificar requisitos para desempleo (Art. 260 LGSS)**
   - ✓ Estar en situación de desempleo involuntario (CUMPLE)
   - ✓ Haber cotizado 12 meses en últimos 6 años (CUMPLE - 8 años)
   - ✓ Estar registrado como demandante (CUMPLE)
   - ✓ Buscar empleo activamente (REQUERIDO)
   - ✓ Aceptar ofertas adecuadas (REQUERIDO)

2. **Calcular base de prestación (Art. 263 LGSS)**
   - Período: Últimos 180 días de cotización (6 meses)
   - Base = Suma de bases últimos 180 días ÷ 180 días × 30 días
   - Base = (2.200€ × 6 meses) ÷ 6 meses = 2.200€/mes

3. **Determinar duración (Art. 263 LGSS)**
   - Edad: 42 años
   - Años cotizados: 12 años
   - Tabla de duración:
     - 30-39 años, 6+ meses: 6 meses (180 días)
     - 40-49 años, 6+ meses: 12 meses (360 días) ← **APLICA**
   - **Duración: 24 meses (720 días)** porque tiene 12 años cotizados

4. **Calcular prestación mensual (Art. 265 LGSS)**
   - Primeros 6 meses: 70% de base reguladora
     - 2.200€ × 70% = 1.540€/mes
   - Meses 7-24: 60% de base reguladora
     - 2.200€ × 60% = 1.320€/mes

5. **Resumen de prestación**
   - Primeros 6 meses: 1.540€/mes × 6 = 9.240€
   - Siguiente 18 meses: 1.320€/mes × 18 = 23.760€
   - **Total 24 meses: 32.000€**

6. **Obligaciones del demandante**
   - Buscar empleo activamente
   - Aceptar ofertas de trabajo adecuadas
   - Comparecer en citas de demandante
   - Notificar cambios de domicilio
   - Acreditar búsqueda de empleo cada mes

**PRESTACIÓN TOTAL: 32.000€ en 24 meses = 1.540€+1.320€/mes**

---

### Caso 5: Trabajador Autónomo - Cotización RETA

**Situación:**
- Trabajador autónomo: Isabel Martínez García
- Actividad: Consultoría empresarial
- Ingresos anuales: 36.000€ (3.000€/mes)
- Sin trabajadores a cargo
- Se afilia obligatoriamente en RETA en enero 2026

**Solución:**

1. **Determinar régimen obligatorio (Art. 161 LGSS)**
   - Trabaja por cuenta propia: SÍ
   - Tiene trabajadores: NO
   - Ingresos: 36.000€/año > SMI
   - **Debe afiliarse obligatoriamente en RETA**

2. **Elegir base de cotización (Art. 161 LGSS)**
   - Base mínima (2026): 1.260€/mes
   - Base máxima (2026): Sin límite
   - Isabel elige: Base media 2.000€/mes
   - *Nota: Puede cambiar base cada año en enero*

3. **Calcular cotización mensual**
   - Base elegida: 2.000€/mes
   - Tipo de cotización: 28,30% (igual que Régimen General)
   - Cotización bruta: 2.000€ × 28,30% = 566€/mes

4. **Desglose de cotización (Art. 161)**
   - Vejez e invalidez: 15,07% = 301,40€
   - Desempleo (voluntario): 6,35% = 127€
   - Formación profesional: 3,75% = 75€
   - Otros: Gestión administrativa
   - **Total mensual: ~568€**

5. **Cálculo anual**
   - Cotización anual: 568€ × 12 = 6.816€
   - Es 100% deducible en IRPF
   - Ahorro fiscal: 6.816€ × 45% (tramo marginal) = 3.067€
   - **Coste neto: 6.816€ - 3.067€ = 3.749€**

6. **Derechos como autónoma RETA**
   - ✓ Jubilación ordinaria a partir de 65 años
   - ✓ Incapacidad permanente (total, absoluta, gran invalidez)
   - ✓ Desempleo (si cotiza voluntariamente)
   - ✓ Maternidad (si cotiza por esa contingencia)
   - ✓ Cobertura médica completa
   - ✓ Muerte y supervivencia para beneficiarios

7. **Simulación de prestaciones futuras**
   - Base reguladora: 2.000€/mes × 25 años = 600.000€
   - Jubilación a 67 años: 2.000€ × 100% = 2.000€/mes (vitalicia)
   - Incapacidad permanente: 1.500€/mes (75% de base)

**COTIZACIÓN ANUAL: 6.816€ (3.749€ netos después de deducción fiscal)**

---

## RESUMEN DE ARTÍCULOS POR TEMA

### Afiliación y Altas/Bajas
Art. 1-20, 74-85, 109, 161

### Cotización
Art. 129-130, 140-180

### Jubilación
Art. 199-215

### Incapacidad
Art. 217-240

### Desempleo
Art. 260-290

### Procedimientos
Art. 298-325

3. La gestión de la Seguridad Social se llevará a cabo por entidades gestoras y servicios comunes de la Seguridad Social, bajo la dirección y tutela de los ministerios competentes.

**Artículo 306. Entidades gestoras.**
Son entidades gestoras de la Seguridad Social:
1. Instituto Nacional de la Seguridad Social (INSS)
2. Tesorería General de la Seguridad Social (TGSS)
3. Instituto Nacional de Gestión Sanitaria (INGESA)
4. Instituto Social de la Marina (ISM)

**Artículo 320. Instituto Nacional de la Seguridad Social (INSS).**
Organismo encargado de:
- Tramitar afiliaciones
- Otorgar prestaciones contributivas
- Administración de fondos
- Inspección y control

**Artículo 325. Tesorería General de la Seguridad Social (TGSS).**
Encargada de:
- Recaudación de cuotas
- Gestión de deudas
- Administración de fondos
- Inspección de cotización

## COTIZACIÓN Y RECAUDACIÓN

**Artículos 129-145. Sistema de cotización:**
- Bases de cotización: Mínima y máxima actualizadas anualmente
- Períodos de cotización: 30 días naturales o calendario
- Bonificaciones: Para actividades de interés público o grupos especiales
- Cuotas a cargo del trabajador: Descuento de nómina obligatorio

## Disposiciones Finales
Última actualización: 2025 - Sujeto a cambios legislativos y reglamentarios`
  },
  {
    title: 'Estatuto de los Trabajadores (ET) - RD Legislativo 2/2015',
    type: 'ley',
    topic: 'Derecho Laboral',
    reference: 'RD Legislativo 2/2015',
    content: `# Estatuto de los Trabajadores

## Artículo 1. Ámbito de aplicación
Se aplica a los trabajadores que voluntariamente prestan servicios para una empresa a cambio de retribución.

## Contrato de trabajo
### Elementos esenciales:
1. Consentimiento de las partes
2. Prestación de servicios retribuida
3. Dependencia o subordinación
4. Voluntariedad del trabajador

## Modalidades de contrato
- **Indefinido**: Sin límite de duración
- **Temporal**: Duración predeterminada (máximo 3 años)
- **A tiempo parcial**: Menos de 30 horas semanales
- **De prácticas**: Para personas con titulación (máximo 2 años)
- **De formación**: Para jóvenes sin experiencia

## Derechos del trabajador
- Salario mínimo interprofesional (SMI)
- Jornada máxima: 40 horas semanales
- Descanso mínimo: 1,5 días a la semana
- Vacaciones: Mínimo 30 días naturales al año
- Igualdad de trato y no discriminación

## Deberes del trabajador
- Realizar el trabajo de forma diligente y responsable
- Cumplir instrucciones del empresario
- Mantener disciplina y buena conducta
- Guardar secretos profesionales

## Jornada y descansos
- Máximo 40 horas semanales
- Máximo 9 horas diarias
- Descanso semanal: 1,5 días consecutivos (sábado/domingo)
- Descanso entre jornadas: Mínimo 12 horas
- Vacaciones: 30 días naturales o más según convenio

## Suspensión del contrato
- Maternidad/paternidad
- Riesgo durante el embarazo
- Incapacidad temporal
- Servicio militar o reclutamiento civil
- Excedencia voluntaria
- Sanciones disciplinarias

## Extinción del contrato
- Voluntad de las partes (mutuo acuerdo)
- Finalización de plazo (contrato temporal)
- Resolución por causas disciplinarias
- Despido objetivo
- Despido colectivo
- Fuerza mayor
- Jubilación
- Muerte del trabajador`
  },
  {
    title: 'Ley 39/2015 - Procedimiento Administrativo Común',
    type: 'ley',
    topic: 'Procedimiento Administrativo',
    reference: 'Ley 39/2015',
    content: `# Ley 39/2015 del Procedimiento Administrativo Común

## Artículo 1. Objeto
Regular el procedimiento administrativo común aplicable a la Administración General del Estado, organismos públicos autónomos, organismos autónomos y entidades gestoras de la Seguridad Social.

## Principios generales
1. Legalidad
2. Jerarquía normativa
3. Imparcialidad
4. Eficacia
5. Servicialidad a los intereses públicos
6. Celeridad
7. Economía procesal
8. Transparencia
9. Participación

## Acto administrativo
Es la manifestación de voluntad de la Administración que produce efectos jurídicos.

### Requisitos de validez:
- Competencia
- Procedimiento
- Fondo (motivación)
- Forma

### Elementos:
- Sujeto (Administración competente)
- Objeto (lo que se ordena)
- Causa (razón del acto)
- Motivación (justificación legal)
- Teleología (fin perseguido)

## Procedimiento administrativo
### Fases:
1. **Iniciación**: Solicitud de parte interesada o de oficio
2. **Instrucción**: Investigación y pruebas
3. **Audiencia**: Se escucha a interesados
4. **Resolución**: Acto administrativo conclusivo
5. **Notificación**: Comunicación a interesados
6. **Recursos**: Posibilidad de impugnación

## Plazos administrativos
- Máximo 3 meses para resolver (salvo ley especial)
- Se computan en días hábiles (de lunes a viernes)
- Se suspenden de 15 de agosto a 1 de septiembre

## Silencio administrativo
- **Positivo**: Pasado el plazo, se entiende estimada la solicitud
- **Negativo**: Pasado el plazo, se entiende denegada
- Depende de lo que diga la ley sectorial

## Recursos
1. **Reposición**: Ante la misma autoridad (10 días)
2. **Alzada**: Ante autoridad superior (3 meses)
3. **Revisión**: Si se descubren hechos nuevos
4. **Contencioso-administrativo**: Ante juzgados`
  },
  {
    title: 'Ley 40/2015 - Régimen Jurídico del Sector Público',
    type: 'ley',
    topic: 'Sector Público',
    reference: 'Ley 40/2015',
    content: `# Ley 40/2015 del Régimen Jurídico del Sector Público

## Artículo 1. Objeto y ámbito
Regular la estructura, organización y funcionamiento de la Administración General del Estado, organismos públicos autónomos y las restantes entidades del sector público estatal.

## Administración General del Estado
Compuesta por:
- Ministerios
- Organismos públicos autónomos
- Sociedades estatales
- Consorcios
- Fundaciones del sector público

## Órganos administrativos
Unidades administrativas con competencias y responsabilidad.

### Tipos:
- **Superiores**: Ministro, Secretario de Estado, etc.
- **Directivos**: Directores generales, subdirectores
- **Consultivos**: Asesorías jurídicas, inspecciones
- **Ejecutivos**: Unidades de ejecución

## Competencias administrativas
### Criterios de atribución:
1. Por materia
2. Por territorio
3. Por grado (conflictos entre órganos)
4. Por tiempo

### Modificación de competencias:
- Por delegación (temporal)
- Por avocación (asumir asunto inferior)
- Por desconcentración (distribuir competencias)

## Órganos colegiados
Órganos integrados por múltiples personas que actúan conjuntamente.

### Requisitos:
- Convocatoria previa
- Quórum suficiente (mayoría)
- Acta de actuaciones
- Votación (si es necesario)

## Administración electrónica
- Registro electrónico
- Notificación electrónica
- Firma electrónica
- Obligatorio en relaciones con Administración

## Responsabilidad patrimonial
La Administración responde por daños y perjuicios causados por:
- Funcionamiento anormal de servicios
- Actos legislativos
- Actos jurisdiccionales (excepto error judicial)`
  },
  {
    title: 'Afiliación, Cotización e Inscripción en la Seguridad Social',
    type: 'tema_general',
    topic: 'Seguridad Social',
    reference: 'LGSS',
    content: `# Afiliación, Cotización e Inscripción en la Seguridad Social

## Afiliación
Es la acción de vincularse a la Seguridad Social como cotizante.

### Requisitos:
1. Tener capacidad de obrar
2. Realizar actividad sujeta a Seguridad Social
3. No estar excluido legalmente
4. Cumplir requisitos del régimen específico

### Efectos de la afiliación:
- Adquisición de derechos
- Obligación de cotizar
- Cobertura de riesgos

### Códigos de afiliación:
- 0001: Afiliación ordinaria
- 0002: Afiliación como beneficiario
- 0003: Re-afiliación

## Cotización
Aportación económica obligatoria a la Seguridad Social.

### Base de cotización:
- **Mínima**: SMI (salario mínimo interprofesional)
- **Máxima**: Determinada anualmente
- **Real**: La que corresponde según salario efectivo

### Porcentajes de cotización:
- **Régimen General**: 28,30% sobre base
  - Empresa: 23,60%
  - Trabajador: 4,70%
- **Desempleo**: 5,5% (empresa) + 1,55% (trabajador)
- **Formación profesional**: 0,6% (empresa) + 0,1% (trabajador)
- **Accidentes de trabajo**: Según sector (0,5% a 6,25%)

### Periodos de cotización:
- Semana: 7 días
- Mes: 30 días
- Año: 360 días
- Antiguedad: 180 días = 6 meses

## Inscripción
Registro de la empresa o del trabajador en la Seguridad Social.

### Datos a registrar:
- Identificación personal
- Domicilio
- Teléfono y email
- Banco (para transferencia)
- Datos de empresa (si aplica)

### Plazos:
- Empresa: Antes de contratar (máximo 60 días)
- Trabajador: Antes de iniciar trabajo
- Cambio de datos: 15 días

## Comunicaciones a la Seguridad Social
- Altas y bajas de trabajadores
- Cambios de situación laboral
- Modificación de datos
- Cese de actividad

## Responsabilidades
- **Empresario**: Afiliar, inscribir y cotizar
- **Trabajador**: Aportar datos correctos
- **Terceros**: Colaborar en procesos de inscripción`
  },
  {
    title: 'Prestaciones por Invalidez y Jubilación',
    type: 'tema_general',
    topic: 'Seguridad Social',
    reference: 'LGSS',
    content: `# Prestaciones por Invalidez y Jubilación

## Incapacidad Permanente
Estado derivado de enfermedad o accidente que impide desarrollar actividad laboral.

### Grados:
1. **Incapacidad Parcial Permanente (IPP)**: Reduce capacidad laboral en tarea habitual
   - Indemnización: Una suma de dinero (24 mensualidades)

2. **Incapacidad Total Permanente (ITP)**: Imposibilita para profesión habitual
   - Pensión: 55% base reguladora (edad 55-59), 75% (60+)
   - Compatibilidad con otros trabajos

3. **Incapacidad Absoluta Permanente (IAP)**: Imposibilita para cualquier trabajo
   - Pensión: 100% base reguladora
   - Incompatible con cualquier actividad laboral

4. **Gran Invalidez**: Necesita ayuda de tercera persona
   - Pensión: 100% base reguladora
   - Plus adicional (50% pensión)
   - Acompañamiento y cuidados

### Base reguladora:
Media de las bases de cotización de los últimos 8 años (360 meses).

### Requisitos:
- Afiliación a Seguridad Social
- Períodos mínimos de cotización (según edad)
- Enfermedad o accidente calificado como causante

## Jubilación
Prestación que sustituye renta laboral por cessation de actividad.

### Tipos:

#### 1. Jubilación ordinaria
- Edad: 67 años (2026)
- Cotización: 15 años como mínimo
- Cuantía: Hasta 100% de la base reguladora

#### 2. Jubilación anticipada
- Edad: Desde 63 años
- Cotización: 35 años (hasta 2027) o 38 años después
- Reducción: 13% por cada año antes de 67

#### 3. Jubilación parcial
- Reduce jornada 25-75%
- Compatible con trabajo
- Edad mínima: 65 años

#### 4. Jubilación flexible
- Jubilación desde 63 a 67 años
- Sin límite de período de cálculo
- Permite compaginación laboral

#### 5. Jubilación para profesionales del mar
- Edad: 60 años
- Requisitos especiales según modalidad

### Edad de jubilación por años de cotización:
- 15-24 años: 67 años
- 25-34 años: 65 años  
- 35 años: 63 años
- 38 años: 60 años

### Compatibilidad de jubilación con actividad:
- Hasta SMI + 25%: Compatible sin límites
- Por encima: Reducción de pensión (20%)

### Base reguladora:
- Últimos 21,75 años (261 meses)
- Se incrementa cada año (7 meses más)
- Hasta 2026: 21,75 años
- Hasta 2027: 22,58 años
- Hasta 2028: 23,41 años
- Desde 2029: 25 años (completos)`
  },
  {
    title: 'Riesgos Laborales y Accidentes de Trabajo',
    type: 'tema_general',
    topic: 'Seguridad Social',
    reference: 'LGSS',
    content: `# Accidentes de Trabajo y Enfermedades Profesionales

## Concepto de accidente de trabajo
Es todo suceso inesperado y repentino que causa lesión corporal al trabajador con ocasión del trabajo.

### Requisitos:
1. Producción de lesión corporal
2. Carácter inesperado y repentino
3. Relación causal con el trabajo
4. Encuadre en contingencia profesional

### Elementos causales:
- **Causa violenta**: Acción o hecho externo
- **Ocasión del trabajo**: Durante ejecución del trabajo
- **Efectos**: Lesión corporal o muerte

### Accidentes "in itinere":
Accidentes durante desplazamiento:
- Casa-Trabajo-Casa: Incluído
- Desviaciones de ruta: Excluído (salvo motivo laboral)
- Descansos: Excluído
- Comidas fuera: Puede ser incluído según circunstancias

## Enfermedades profesionales
Lesión corporal causada por el trabajo que produce incapacidad.

### Requisitos especiales:
1. Causada por causa del trabajo (exposición prolongada)
2. Incluida en el cuadro de enfermedades profesionales
3. Relación causal probada

### Cuadro oficial:
- Enfermedades por agentes químicos
- Enfermedades por agentes físicos
- Enfermedades causadas por radiaciones
- Enfermedades infecciosas
- Enfermedades por inhalación de polvo
- Enfermedades sistémicas

## Diferencia: Accidente vs Enfermedad
| Característica | Accidente | Enfermedad |
|---|---|---|
| Origen | Traumático, inesperado | Gradual, proceso evolutivo |
| Causa | Violencia externa | Exposición prolongada |
| Momento | Instantáneo | Tiempo indeterminado |
| Prueba | Inmediata | Requiere investigación |

## Obligaciones del empresario:
1. Notificar accidente a autoridades
2. Investigar causas
3. Implementar medidas preventivas
4. Mantener seguros de responsabilidad civil
5. Registrar accidentes

## Prestaciones por accidente de trabajo:
1. **Asistencia sanitaria**: Cobertura total
2. **Incapacidad temporal**: 75% base reguladora
3. **Incapacidad permanente**: Según grado
4. **Muerte y supervivencia**: Pensiones a beneficiarios

## Procedimiento de denuncia:
1. Comunicación inmediata al empresario
2. Denuncia a autoridades (2 días laborales)
3. Informe médico
4. Resolución sobre calificación
5. Prestación económica (si procede)`
  }
]

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Solo permitir a admin o request sin sesión en desarrollo
    if (session && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('[Seed] Iniciando carga de documentos de referencia...')

    // Verificar si ya existen documentos
    const existingCount = await prisma.legalDocument.count()
    console.log(`[Seed] Documentos existentes: ${existingCount}`)

    // Cargar cada documento
    const createdDocs = []
    const updatedDocs = []
    for (const doc of SEED_DOCUMENTS) {
      try {
        // Evitar duplicados - pero actualizar si existe
        const existing = await prisma.legalDocument.findFirst({
          where: { title: doc.title }
        })

        if (existing) {
          console.log(`[Seed] 🔄 Actualizando: ${doc.title}`)
          const updated = await prisma.legalDocument.update({
            where: { id: existing.id },
            data: {
              content: doc.content,
              type: doc.type as any,
              topic: doc.topic,
              reference: doc.reference
            }
          })
          updatedDocs.push(updated)
          console.log(`[Seed] ✅ Actualizado: ${doc.title}`)
          continue
        }

        const created = await prisma.legalDocument.create({
          data: {
            title: doc.title,
            type: doc.type as any,
            topic: doc.topic,
            reference: doc.reference,
            content: doc.content,
            fileName: null,
            fileSize: null
          }
        })

        createdDocs.push(created)
        console.log(`[Seed] ✅ Creado: ${doc.title} (${created.id})`)
      } catch (error) {
        console.error(`[Seed] ❌ Error creando ${doc.title}:`, error)
      }
    }

    const totalNow = await prisma.legalDocument.count()

    return NextResponse.json({
      message: 'Documentos de referencia cargados/actualizados exitosamente',
      created: createdDocs.length,
      updated: updatedDocs.length,
      totalDocuments: totalNow,
      documents: [...createdDocs, ...updatedDocs].map(d => ({
        id: d.id,
        title: d.title,
        type: d.type,
        topic: d.topic
      }))
    })
  } catch (error) {
    console.error('[Seed] Error fatal:', error)
    return NextResponse.json({
      error: 'Error al cargar documentos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// GET - Ver estado actual
export async function GET(req: NextRequest) {
  try {
    const totalDocs = await prisma.legalDocument.count()
    const docs = await prisma.legalDocument.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        topic: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      total: totalDocs,
      documents: docs,
      seedDocumentsAvailable: SEED_DOCUMENTS.length,
      message: totalDocs === 0 
        ? 'Base de datos vacía. Usa POST para cargar documentos de referencia.'
        : `Base de datos tiene ${totalDocs} documentos`
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Error al leer documentos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
