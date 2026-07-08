# WINF ERP/CRM — Plan Maestro de Desarrollo
**Proyecto:** Sistema de gestión integral para WINF (Williams Informática)
**Dominio:** `erp.winf.com.ar` (subdominio de winf.com.ar)
**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Auth + Postgres + Storage) · Vercel · Framer Motion · @react-pdf/renderer · date-fns · Zod · Zustand
**Metodología:** Desarrollo por fases con Claude Code (Fable 5), una fase por sesión, verificación al final de cada fase.

---

## 0. Cómo usar este documento con Claude Code

1. Actualizá Claude Code: `claude update` (Fable 5 requiere v2.1.170 o superior).
2. Creá la carpeta del proyecto y entrá: `mkdir winf-erp && cd winf-erp && claude`
3. Seleccioná el modelo: `/model fable`
4. **Primera sesión:** pegá el contenido de la sección "1. CLAUDE.md" para que lo cree como archivo `CLAUDE.md` en la raíz. Ese archivo es la memoria del proyecto — Claude Code lo lee en cada sesión.
5. Después ejecutá los prompts de fase, **uno por sesión**. Al terminar cada fase, verificá con la checklist y recién ahí pasá a la siguiente.
6. Fable 5 rinde mejor si le describís el **resultado**, no los pasos. Los prompts de este documento ya están escritos así. Si una fase es grande, agregá al final del prompt: *"Usá subagentes en paralelo para las partes independientes (por ejemplo: schema, UI y tipos al mismo tiempo) y verificá el build antes de dar por terminada la fase."*

---

## 1. CLAUDE.md (memoria del proyecto — crear primero)

```markdown
# WINF ERP — Contexto del proyecto

## Qué es
ERP/CRM interno para WINF (winf.com.ar), empresa de servicios técnicos IT en Morteros, Córdoba, Argentina.
Rubros: instalación de Starlink, redes, cámaras de seguridad, mantenimiento, venta de equipos, configuraciones.
Usuario principal: Williams (dueño). Preparado para sumar rol "técnico" a futuro.

## Stack (no cambiar sin consultar)
- Next.js 15 App Router + TypeScript estricto
- Tailwind CSS v4 + shadcn/ui + Framer Motion (animaciones sutiles, no circo)
- Supabase: Auth (email/password), Postgres con RLS, Storage (logos, adjuntos)
- Vercel (deploy) + Vercel Cron (cargos recurrentes)
- PDFs: @react-pdf/renderer
- Validación: Zod en todos los formularios y server actions
- Estado cliente: Zustand solo donde haga falta; preferir Server Components

## Identidad visual
- Color primario: teal #13B5A6. Secundario: dark slate #1F2A30.
- Modo oscuro por defecto, toggle claro/oscuro.
- Diseño ornado pero profesional: cards con bordes sutiles, micro-animaciones, tipografía Inter o Geist.
- Logo WINF en sidebar y en todos los PDFs.

## Reglas de negocio clave
- Moneda: ARS por defecto, USD opcional en documentos. Guardar SIEMPRE moneda + monto.
- "Factura" del sistema = comprobante interno WINF (no fiscal). Nombrar "Comprobante".
- Caso Starlink: contrato = equipo financiado (hasta 6 cuotas sin interés, con entrega inicial opcional)
  + instalación (cargo único) + suscripción mensual (plan Starlink + soporte WINF, se muestra
  como monto único al cliente pero se guarda desglosado).
- Los precios de suscripción pueden cambiar: guardar precio histórico en cada cargo generado.
- Stock serializado: cada equipo tiene S/N, estado (en_stock/asignado/instalado/rma/baja) e historial.
- Cargos mensuales y gastos recurrentes se generan automáticamente el día 1 (Vercel Cron).

## Convenciones
- Español en toda la UI. Código y nombres de tablas/columnas en inglés.
- Fechas: date-fns con locale es. Formato dd/MM/yyyy.
- Montos: Intl.NumberFormat('es-AR') — $ 300.000,00
- RLS activada en TODAS las tablas. Funciones security definer donde haga falta.
- Server Actions para mutaciones; nada de API routes salvo cron y webhooks.
- Al terminar cada fase: `npm run build` debe pasar sin errores ni warnings de tipos.
```

---

## 2. Arquitectura de datos (schema de referencia)

Este es el modelo que Claude Code debe implementar en la Fase 1. Está diseñado para que cámaras, redes y empresas entren sin tocar el schema.

### Núcleo CRM
- **clients** — id, first_name, last_name, business_name, dni, cuit_cuil, email, phone (formato WhatsApp), address, city, province, status (`activo/inactivo/moroso/potencial`), lat, lng, internal_notes, created_at
- **profiles** — usuarios del sistema (extiende auth.users): full_name, role (`admin/tecnico`)

### Catálogo y contratos
- **service_categories** — Starlink, Redes, Cámaras, Mantenimiento, Venta de equipos, Configuraciones… (CRUD, se pueden agregar más)
- **services** — nombre, categoría, tipo (`unico/recurrente`), precio base, moneda, activo
- **contracts** — el corazón del sistema. client_id, título, estado (`activo/pausado/finalizado/cancelado`), fecha_inicio, notas
- **contract_items** — líneas del contrato, cada una con `item_type`:
  - `equipo_financiado`: monto total, entrega inicial, cantidad de cuotas, equipo asignado (FK a inventory_items)
  - `cargo_unico`: instalación, configuración, etc.
  - `suscripcion`: monto mensual (desglosado en sub-líneas internas: plan Starlink 45.000 + soporte WINF 20.000), día de facturación
- **installments** — plan de cuotas generado por cada `equipo_financiado`: número (2/6), monto, vencimiento, estado (`pendiente/pagada/vencida`), fecha_pago, método de pago
- **subscription_charges** — cargos mensuales generados por cron: contrato, período (2026-07), monto (precio histórico congelado), estado, fecha_pago

### Stock serializado
- **products** — modelo/tipo: "Starlink Mini", "Cámara Hikvision X", "Router TP-Link Y"… con categoría, costo, precio venta
- **inventory_items** — unidad física: product_id, serial_number, mac/nº fabricante, estado (`en_stock/asignado/instalado/rma/baja`), client_id (nullable), notas
- **inventory_movements** — historial: quién, cuándo, de qué estado a cuál, a qué cliente

### Documentos
- **documents** — tipo (`presupuesto/informe_tecnico/remito_ot/comprobante`), numeración automática por tipo (PRE-0001, OT-0001…), client_id (nullable — "seleccionar si es para un cliente o no"), fecha creación, válido hasta, moneda (ARS/USD), estado (`borrador/enviado/aceptado/vencido`), items JSONB (descripción, cantidad, precio), totales, notas, pdf_url en Storage

### Agenda
- **appointments** — turnos: client_id, contract_id (opcional), tipo (`instalacion/soporte/relevamiento/mantenimiento`), fecha/hora inicio y fin, estado (`pendiente/confirmado/completado/cancelado`), técnico asignado, dirección (default: la del cliente), notas

### Finanzas
- **transactions** — libro único de movimientos: tipo (`ingreso/egreso`), origen (`cuota/suscripcion/cargo_unico/venta/gasto_manual/gasto_recurrente`), FK opcional a installment/charge/document, categoría, monto, moneda, fecha, descripción. **Los ingresos se crean automáticamente al marcar pagada una cuota/suscripción.**
- **expense_categories** — materiales, equipos, combustible, herramientas, servicios (lo que Williams paga de Starlink por cliente), etc.
- **recurring_expenses** — gastos que el cron genera cada mes (ej: costo mensual Starlink por cada cliente activo)

### Soporte (sugerido)
- **tickets** — client_id, asunto, prioridad, estado (`abierto/en_proceso/resuelto/cerrado`), mensajes/timeline. Justifica la suscripción de soporte con historial real.

---

## 3. Fases de desarrollo (prompts para Claude Code)

> Pegá cada prompt en una sesión nueva de Claude Code con `/model fable`. No avances de fase sin pasar la checklist.

---

### FASE 1 — Fundación: proyecto, Supabase, auth y layout

```
Creá el proyecto WINF ERP desde cero según CLAUDE.md. Resultado esperado:

1. Next.js 15 App Router + TypeScript estricto + Tailwind v4 + shadcn/ui instalado y configurado
   con el tema WINF (primario teal #13B5A6, secundario #1F2A30, modo oscuro por defecto con toggle).
2. Supabase configurado con @supabase/ssr (cliente browser + server + middleware).
3. Migración SQL completa en /supabase/migrations con TODAS las tablas de la sección
   "Arquitectura de datos" del plan maestro (te la pego abajo), con:
   - RLS activada en todas las tablas: solo usuarios autenticados con profile acceden
   - Trigger que crea profile al registrarse
   - Función de numeración automática de documentos por tipo (PRE-0001, OT-0001, COMP-0001, INF-0001)
   - Índices en FKs y campos de búsqueda (clients.last_name, inventory_items.serial_number)
   - Seed con las 6 categorías de servicio iniciales y categorías de gastos
4. Login (email/password) con página elegante con el branding WINF. Sin registro público:
   los usuarios se crean desde Supabase dashboard.
5. Layout del dashboard: sidebar colapsable con logo WINF, navegación (Dashboard, Clientes,
   Contratos, Servicios, Stock, Documentos, Agenda, Finanzas, Tickets, Configuración),
   header con búsqueda global (placeholder por ahora), toggle de tema y menú de usuario.
6. Página Dashboard con cards de KPIs en placeholder (los conectamos en Fase 9).

[PEGAR ACÁ LA SECCIÓN 2 COMPLETA DEL PLAN MAESTRO]

Usá subagentes en paralelo para schema SQL, configuración de auth y layout UI.
Verificá que npm run build pase limpio antes de terminar.
```

**Checklist:** login funciona · RLS bloquea acceso anónimo (probar con anon key) · sidebar navega · build limpio.

---

### FASE 2 — Clientes (CRM completo)

```
Implementá el módulo Clientes completo:

1. Listado con tabla shadcn: búsqueda por nombre/DNI/CUIT/teléfono, filtros por estado y
   localidad, paginación server-side, badge de color por estado
   (activo=teal, moroso=rojo, potencial=amarillo, inactivo=gris).
2. Alta/edición con formulario Zod + react-hook-form con todos los campos:
   nombre, apellido, empresa/razón social, DNI, CUIT/CUIL, email, teléfono (con
   normalización a formato WhatsApp +54 9...), dirección, localidad, provincia
   (select con las 24 provincias argentinas, default Córdoba), estado, notas internas.
3. Selector de ubicación con mapa: Leaflet + OpenStreetMap (gratis, sin API key).
   Buscar dirección con Nominatim, pin arrastrable, guarda lat/lng.
4. Ficha del cliente (página de detalle) con tabs: Resumen (datos + mini-mapa +
   botón "Abrir en Google Maps" + botón WhatsApp directo), Contratos, Equipos asignados,
   Documentos, Turnos, Movimientos — los tabs que dependen de fases futuras quedan
   con empty-state elegante.
5. Acciones: editar, cambiar estado, eliminar con confirmación (soft delete si tiene
   contratos asociados).

Diseño ornado según CLAUDE.md: transiciones suaves, skeleton loaders, empty states con ilustración.
```

**Checklist:** alta con mapa funciona · búsqueda y filtros server-side · WhatsApp abre con el número correcto · build limpio.

---

### FASE 3 — Servicios y catálogo

```
Implementá el módulo Servicios:

1. CRUD de categorías de servicio (Starlink, Redes, Cámaras, Mantenimiento, Venta de
   equipos, Configuraciones + agregar/editar/desactivar más).
2. CRUD de servicios dentro de cada categoría: nombre, tipo (único/recurrente),
   precio base, moneda, descripción, activo/inactivo.
3. Precargar el caso Starlink como seed:
   - "Equipo Starlink Mini" (único, $300.000)
   - "Instalación de antena" (único, $120.000)
   - "Servicio mensual Starlink Residencial Lite" (recurrente, $45.000)
   - "Soporte técnico y gestión WINF" (recurrente, $20.000)
4. Los precios son editables — cuando cambian NO se tocan los cargos ya generados
   (precio histórico congelado en installments y subscription_charges).
5. Vista de catálogo en cards por categoría con precios formateados es-AR.
```

**Checklist:** CRUD completo · seed Starlink cargado · cambiar un precio no altera nada existente.

---

### FASE 4 — Contratos, financiación en cuotas y suscripciones (fase crítica)

```
Implementá el módulo Contratos, el corazón del sistema. Leé con atención el modelo
contract_items del schema.

1. Wizard "Nuevo contrato" en pasos:
   a. Seleccionar cliente (buscador) → b. Seleccionar categoría/servicios → c. Configurar cada ítem:
   - equipo_financiado: monto total, entrega inicial (opcional), cantidad de cuotas (1 a 6,
     sin interés), selector de equipo del stock (por S/N, solo items en_stock — si la Fase 5
     no existe aún, dejar el selector preparado con empty state), al confirmar genera el plan
     de cuotas en installments con vencimientos mensuales.
   - cargo_unico: concepto y monto (ej: instalación $120.000).
   - suscripcion: monto mensual compuesto por sub-líneas (plan Starlink $45.000 + soporte
     WINF $20.000 = muestra $65.000 al cliente), día de facturación, fecha de inicio.
   d. Resumen final: fecha de instalación, tipo de plan (texto libre: "Residencial Lite"), notas.
2. Detalle del contrato: timeline de cuotas con progreso visual (2/6 pagadas), botón
   "Registrar pago" por cuota (fecha + método: efectivo/transferencia/MercadoPago) que
   crea automáticamente la transaction de ingreso, estado de suscripción con historial
   de cargos mensuales.
3. Al registrar pago de la última cuota, marcar el ítem como saldado con celebración sutil.
4. Listado de contratos con filtros por estado, cliente y categoría, y indicador de
   cuotas vencidas (rojo).
5. Caso de prueba completo del ejemplo Starlink: equipo 300.000 en 6 cuotas con entrega
   de 60.000, instalación 120.000, suscripción 65.000/mes.

Usá subagentes: uno para la lógica de generación de cuotas (con tests de los cálculos:
entrega inicial, redondeo de última cuota), otro para el wizard UI.
```

**Checklist:** cuotas se generan bien (probar 300.000 − 60.000 entrega en 6 = 40.000 c/u) · pago de cuota crea ingreso en transactions · progreso 2/6 visible.

---

### FASE 5 — Stock serializado

```
Implementá el módulo Stock:

1. CRUD de productos (modelos): "Starlink Mini", cámaras, routers, antenas P2P, switches…
   con categoría, costo de compra, precio de venta, umbral de stock mínimo.
2. Inventario serializado: alta de unidades físicas con serial_number (único), número de
   fabricante/MAC, estado inicial en_stock, notas. Alta múltiple (pegar lista de S/N).
3. Asignación a cliente: desde el inventario o desde el wizard de contrato (conectar el
   selector que quedó preparado en Fase 4). Estados: en_stock → asignado → instalado → rma/baja.
4. Historial por equipo (inventory_movements): timeline de cada cambio de estado con
   fecha, usuario y cliente. Esto es la trazabilidad para garantías.
5. Vista general: cards por producto con contador por estado, alerta visual si stock
   disponible < umbral mínimo, búsqueda global por S/N.
6. En la ficha del cliente, el tab "Equipos asignados" ahora muestra sus equipos con S/N.
```

**Checklist:** buscar por S/N encuentra el equipo · asignar desde contrato cambia estado · historial completo visible.

---

### FASE 6 — Documentos y PDFs (presupuestos, informes, remitos/OT, comprobantes)

```
Implementá el módulo Documentos con generación de PDF profesional:

1. Cuatro tipos: Presupuesto (PRE-xxxx), Informe técnico (INF-xxxx), Remito/OT (OT-xxxx),
   Comprobante (COMP-xxxx). Numeración automática por tipo.
2. Creación: seleccionar tipo → asociar a cliente O modo "sin cliente" (datos manuales) →
   items con descripción/cantidad/precio unitario → moneda ARS o USD → fecha de creación
   y "válido hasta" → notas/condiciones. Informe técnico usa cuerpo de texto enriquecido
   (tiptap) en vez de items.
3. PDF con @react-pdf/renderer, plantilla WINF: logo, teal #13B5A6 en encabezados,
   datos de WINF (winf.com.ar, contacto), numeración, tabla de items, totales, condiciones,
   pie profesional. Botones: Ver PDF, Descargar, guardar copia en Supabase Storage.
4. Comprobante de contrato: generar desde el detalle del contrato → incluye detalle de
   cuotas pagadas/restantes (ej: "Cuota 2/6 — Restan 4 cuotas de $40.000") y el cargo
   mensual como monto único ("Servicio mensual WINF: $65.000").
5. Estados de documento: borrador/enviado/aceptado/vencido (auto-vencido si pasa
   "válido hasta"). Acción "Convertir presupuesto en contrato" (precarga el wizard).
6. Listado con filtros por tipo, cliente, estado y rango de fechas.

El logo: dejá /public/logo-winf.svg como placeholder y usalo en el PDF; lo reemplazo yo
con el definitivo.
```

**Checklist:** PDF se ve profesional en ARS y USD · comprobante muestra 2/6 correcto · numeración no se repite.

---

### FASE 7 — Agenda de turnos

```
Implementá la Agenda:

1. Calendario con vistas mes/semana/día (usar una lib liviana o construirlo con date-fns;
   evitar dependencias pesadas). Estilo consistente con el tema WINF.
2. Turnos: cliente, contrato opcional, tipo (instalación/soporte/relevamiento/mantenimiento),
   fecha/hora inicio-fin, dirección (autocompleta con la del cliente), notas, estado
   (pendiente/confirmado/completado/cancelado). Colores por tipo.
3. Crear turno desde: la agenda, la ficha del cliente, o al finalizar el wizard de contrato
   ("¿Agendar instalación?" con la fecha de instalación precargada).
4. Vista "Hoy" en el dashboard: próximos turnos con botón WhatsApp al cliente
   ("Hola {nombre}, te confirmo la visita de {tipo} para el {fecha} a las {hora} — WINF")
   con mensaje editable antes de abrir wa.me.
5. Detección de superposición de turnos con advertencia (no bloqueo).
6. Drag & drop para reprogramar en vista semana.
```

**Checklist:** crear/mover/completar turnos · WhatsApp de confirmación con texto correcto · superposición advierte.

---

### FASE 8 — Finanzas y automatización (cron)

```
Implementá el módulo Finanzas con generación automática de movimientos:

1. Libro de movimientos (transactions): tabla con filtros por tipo, categoría, origen,
   rango de fechas y moneda. Los ingresos por cuotas/suscripciones ya se crean solos
   (Fase 4) — acá se visualizan todos.
2. Gastos manuales: alta rápida con categoría (materiales, equipos, combustible,
   herramientas, otros), monto, fecha, descripción, adjunto opcional (foto de ticket
   a Supabase Storage).
3. Gastos recurrentes: CRUD de recurring_expenses. Caso clave: "Costo mensual Starlink"
   vinculado a cada contrato con suscripción activa — cuando doy de alta un cliente
   Starlink, su costo mensual se registra como gasto recurrente automático.
4. Vercel Cron (día 1 de cada mes, ruta /api/cron/monthly protegida con CRON_SECRET):
   a. Genera subscription_charges del período para cada suscripción activa
      (precio vigente congelado en el cargo).
   b. Genera transactions de egreso por cada gasto recurrente activo.
   c. Marca como "vencida" toda cuota/cargo impago con vencimiento pasado y
      actualiza el cliente a "moroso" si acumula 2+ vencidos.
   Idempotente: correrlo dos veces el mismo mes no duplica nada.
5. Registrar pago de un cargo de suscripción → crea el ingreso automáticamente.
6. Resumen mensual: ingresos vs egresos, resultado neto, gráfico de barras últimos
   12 meses (recharts), desglose por categoría.

Usá subagentes: uno para el cron con tests de idempotencia, otro para la UI de finanzas.
```

**Checklist:** correr el cron manualmente 2 veces no duplica · pago de suscripción genera ingreso · gráfico 12 meses correcto.

---

### FASE 9 — Dashboard con KPIs reales

```
Conectá el Dashboard con datos reales:

1. Cards principales: MRR (suma de suscripciones activas), clientes activos, cuotas por
   cobrar este mes ($ y cantidad), cuotas vencidas (rojo, click lleva al listado filtrado),
   resultado del mes (ingresos − egresos), equipos en stock disponibles.
2. Próximos turnos (5) con acceso rápido.
3. Gráfico ingresos vs egresos últimos 6 meses.
4. Actividad reciente: últimos pagos, contratos nuevos, documentos emitidos.
5. Mapa de clientes: Leaflet con todos los clientes geolocalizados, pin coloreado por
   estado, popup con nombre y acceso a la ficha. Útil para planificar rutas de instalación.
6. Búsqueda global del header ahora funcional: busca en clientes, contratos, S/N de
   equipos y documentos (cmd+K con shadcn Command).
```

**Checklist:** todos los números cuadran contra los módulos · mapa carga rápido · cmd+K encuentra por S/N.

---

### FASE 10 — Tickets de soporte

```
Implementá Tickets de soporte (justifica la suscripción de soporte WINF con historial real):

1. CRUD de tickets: cliente, asunto, descripción, prioridad (baja/media/alta/urgente),
   estado (abierto/en_proceso/resuelto/cerrado), equipo relacionado opcional (por S/N).
2. Timeline de actualizaciones dentro del ticket (notas con fecha y autor).
3. Al resolver: campo "solución aplicada" + tiempo invertido (para saber si los $20.000
   de soporte mensual cierran con la realidad).
4. Tab Tickets en la ficha del cliente. Contador de tickets abiertos en el sidebar.
5. Métricas simples: tickets por mes, tiempo promedio de resolución, clientes con más tickets.
```

---

### FASE 11 — Configuración, roles y pulido

```
Fase de cierre:

1. Página Configuración: datos de WINF (nombre, CUIT, contacto, dominio — se usan en los
   PDFs), subir/cambiar logo (Storage), gestión de usuarios con roles (admin ve todo,
   técnico ve agenda/tickets/clientes sin finanzas), preferencias (día de facturación
   default, moneda default).
2. Auditoría ligera: created_by/updated_by en tablas críticas.
3. Revisión de performance: dynamic imports para mapas y PDFs, revalidación correcta,
   imágenes optimizadas, bundle analyzer — objetivo Lighthouse 90+ en el dashboard.
4. Revisión de RLS completa: probar cada tabla con rol técnico.
5. Responsive completo: el sistema se usa desde el celular en instalaciones — la agenda,
   fichas de cliente, registrar pagos y tickets tienen que ser cómodos en mobile.
6. Empty states, toasts de confirmación (sonner) y manejo de errores consistente en todo.
```

---

### FASE 12 (futura) — Extensiones
- **Portal del cliente** (`clientes.winf.com.ar`): login del cliente para ver sus cuotas, comprobantes y abrir tickets.
- **MercadoPago**: link de pago por cuota/suscripción + webhook que marca pagado solo (ya lo trabajaste en ACORDAMOS — mismo patrón).
- **Recordatorios automáticos por WhatsApp** (cuota por vencer, turno mañana) vía API de WhatsApp Business o WATI.
- **Facturación electrónica ARCA** si algún día necesitás comprobantes fiscales.
- **Reportes exportables** (Excel/PDF de finanzas mensuales).

---

## 4. Deploy y subdominio

1. **Supabase:** crear proyecto nuevo (no reutilizar el de otros proyectos). Correr las migraciones con `supabase db push` o pegando el SQL en el editor.
2. **Vercel:** importar el repo, variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo server, para el cron)
   - `CRON_SECRET` (string aleatorio largo)
3. **Subdominio `erp.winf.com.ar`:**
   - En Vercel: Project → Settings → Domains → agregar `erp.winf.com.ar`.
   - En tu DNS (donde tenés winf.com.ar): registro **CNAME** `erp` → `cname.vercel-dns.com`. Si usás Cloudflare, dejalo en "DNS only" (nube gris) hasta que Vercel emita el SSL, después podés activar proxy si querés.
4. **Cron:** `vercel.json` con `{"crons": [{"path": "/api/cron/monthly", "schedule": "0 6 1 * *"}]}` (día 1, 06:00 UTC = 03:00 Argentina).
5. En Supabase Auth → URL Configuration: agregar `https://erp.winf.com.ar` como Site URL y redirect.

---

## 5. Datos de negocio de referencia (para seeds y pruebas)

| Concepto | Tipo | Monto |
|---|---|---|
| Equipo Starlink Mini | Único, financiable hasta 6 cuotas sin interés | $300.000 |
| Instalación de antena | Único | $120.000 |
| Servicio mensual Starlink Residencial Lite | Recurrente | $45.000 |
| Soporte técnico y gestión WINF | Recurrente | $20.000 |
| **Total mensual mostrado al cliente** | | **$65.000** |

Caso de prueba estándar: cliente nuevo, equipo en 6 cuotas con entrega de $60.000 → 6 cuotas de $40.000 → comprobante debe mostrar "Cuota X/6" y "Servicio mensual WINF: $65.000".
