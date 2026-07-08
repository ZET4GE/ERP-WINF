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
