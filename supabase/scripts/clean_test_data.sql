-- ============================================================
-- Limpieza de datos de prueba — WINF ERP
-- ============================================================
-- Este script NO es una migración (no cambia el esquema): es un script de
-- mantenimiento para correr una sola vez, a mano, desde el SQL Editor de
-- Supabase, antes de poner el sistema en uso real.
--
-- Borra todo lo "operativo" (clientes, contratos, cuotas, cargos, turnos,
-- tickets, documentos, movimientos de caja, gastos recurrentes, stock
-- serializado y el log de recordatorios de WhatsApp) cargado como prueba.
--
-- Mantiene intacto:
--   - profiles / auth.users        (usuarios y roles)
--   - company_settings             (nombre, logo, CUIT, preferencias)
--   - service_categories, services (catálogo Starlink/Redes/Cámaras/Mantenimiento)
--   - products                     (catálogo de equipos/modelos, no el stock serializado)
--   - expense_categories           (categorías de gastos)
--
-- El TRUNCATE de una sola pasada respeta automáticamente las foreign keys
-- entre las tablas listadas (CASCADE queda como resguardo extra por si en el
-- futuro se agrega alguna FK que no esté contemplada acá).
--
-- IMPORTANTE: esto es irreversible. Hacé un backup/point-in-time-restore
-- desde el dashboard de Supabase antes de correrlo si tenés alguna duda.


truncate table
  public.whatsapp_reminders,
  public.ticket_updates,
  public.tickets,
  public.documents,
  public.installments,
  public.subscription_charges,
  public.inventory_movements,
  public.inventory_items,
  public.contract_items,
  public.contracts,
  public.appointments,
  public.transactions,
  public.recurring_expenses,
  public.clients
cascade;

-- Reinicia la numeración de comprobantes/presupuestos/etc. a 0 (las filas de
-- document_counters son config, no se truncan, solo se resetea el contador).
update public.document_counters set last_number = 0;
