# Cuenta clara — brief de producto para construir el backend real

Contexto: ya existe un prototipo visual funcional en HTML/JS puro (`dashboard-gastos-familia.html`,
adjunto) que valida toda la lógica de negocio con datos de ejemplo. La tarea es reconstruir esa
misma lógica sobre Next.js + Supabase + un bot de WhatsApp, usando `schema.sql` (adjunto) como
base de datos. No inventes reglas nuevas — todas están validadas abajo.

## Familia y reparto de ingreso

- Mamá cobra **semanal**, ciclo **sábado a viernes**, paga el sábado. Cada depósito semanal se
  ancla al sábado de esa semana (si se captura tarde, se normaliza al sábado más reciente hacia atrás).
- Papá cobra **quincenal**, un solo depósito por quincena.
- Una quincena es: **día 1 al 15** o **día 16 al fin de mes** del calendario (no es un ciclo de
  pago custom, es calendario puro).
- El ingreso total de una quincena = suma de las semanas de mamá que caen en esa quincena + el
  depósito de papá de esa quincena.
- Ese total se reparte en tres porcentajes editables (default: personal 8.4%, ahorro general 15%,
  ahorro navideño 5%). El resto ("va al hogar") se destina primero a **gastos fijos necesarios**
  (suma de presupuestos de categorías tipo `fijo`), y lo que sobra es el **disponible para
  variables** — la bolsa que de verdad se mueve día a día.

## Categorías y presupuesto

- Categorías son **editables por el usuario** (agregar/quitar), cada una con tipo `fijo` o
  `variable` y un presupuesto (`budget_current`).
- El "gastado" de una categoría se calcula **solo con transacciones de la quincena actual**
  (o la que se esté viendo), nunca de todo el historial acumulado.
- Alerta de sobregiro: cuando `gastado > presupuesto` en cualquier categoría, se muestra un aviso.
- Alerta de presupuesto irreal: si la suma de presupuestos variables > disponible para variables,
  avisar que el plan no cuadra.

## Etiquetas de cada gasto

Cada transacción lleva dos etiquetas independientes:
- **Prioridad**: `necesidad` (necesidad primaria) o `prescindible` (no esencial).
- **Tipo** (una o varias): Alimentos, Cultura, Entretenimiento, Escuela, Trabajo, Comida, Salud,
  Transporte, Otro. Esta lista es editable pero arranca con estas.

## Tarjetas de crédito

- Cada tarjeta tiene día de corte y día de pago (día del mes, 1-31), y opcionalmente un límite.
- El sistema calcula automáticamente, con la fecha real de hoy: próximo corte, próximo pago,
  días desde el último corte, días hasta el próximo corte.
- **Rotación semanal automática**: hay una "tarjeta de la semana" que rota sola según el número de
  semana ISO del año (`semana_iso % número_de_tarjetas`), con posibilidad de que el usuario la
  adelante manualmente con un botón "siguiente" (esto se implementó como un offset manual sumado
  al número de semana — revisar el prototipo para la fórmula exacta).
- Al registrar un gasto, el método de pago preselecciona la tarjeta de la semana por default.
- Cada tarjeta muestra: gastado en su corte actual, gastado esta semana específicamente, y la
  categoría donde más se ha gastado con ella.

## Metas de ahorro

- El usuario puede crear metas nuevas (nombre + monto objetivo) y abonarles dinero cuando quiera.
- Guardar los abonos como historial (`goal_contributions`), no solo sobreescribir un total.

## Navegación entre quincenas (historial y proyección)

- El usuario puede moverse ◀ / ▶ entre quincenas, no solo ver "la de hoy".
- Si la quincena vista es **anterior** a la actual → es historial (datos reales ya sucedidos).
- Si es **posterior** → es una **proyección**: el usuario puede anotar cuánto planea que le
  depositen (ej. "dentro de 3 quincenas, papá tendrá $50,000") sin que afecte la quincena actual.
  Marcar esos registros con `is_projection = true`.
- Los gastos (`transactions`) siempre se registran con la fecha real de HOY — no tiene sentido
  registrar un gasto en una quincena futura. Si el usuario está navegando una quincena distinta a
  la actual y usa el formulario de registrar gasto, avisarle que se va a guardar en la quincena de
  hoy, no en la que está viendo.

## Vista semanal vs. quincenal (del gasto, no del ingreso)

- Aparte de todo lo anterior, hay un selector "Semanal / Quincenal" que solo afecta cómo se ve el
  **gasto** por categoría (semana ISO lunes-domingo vs. quincena de calendario). Esto es
  independiente del ciclo de pago de mamá (sábado-viernes) — son dos nociones de "semana"
  distintas a propósito, no hay que unificarlas salvo que el usuario lo pida.

## WhatsApp

- El flujo objetivo: el usuario manda foto de un tiket, o un texto tipo "50 al niño, colegio", o
  nota de voz → el webhook lo recibe → si es foto, OCR con un modelo de visión (usar la API de
  Claude) para extraer monto/comercio/fecha en JSON → se inserta en `transactions` → se responde
  por WhatsApp confirmando en segundos → el dashboard se entera solo vía Supabase Realtime.
- El parser debe poder asignar categoría, prioridad y tags automáticamente cuando el mensaje lo
  permite (ej. "colegio" → categoría "Colegio hijo", tag "Escuela", prioridad "necesidad"), y
  marcar `needs_review = true` cuando no esté seguro.

## Lo que el usuario es (para el tono de la UI)

Quien usa esto es una familia común, no gente de finanzas. El dueño del proyecto es diseñador
UX/UI (no programador), así que la claridad visual importa tanto como que los números cuadren:
usar alertas claras, evitar jerga financiera, y mantener la estética tipo "libreta de contabilidad"
del prototipo (fondo oscuro, números en monoespaciada, colores con significado consistente:
coral=mamá, azul=papá, verde=bien, ámbar=cerca del límite, rojo=sobregiro).
