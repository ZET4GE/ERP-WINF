import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { TicketFilters } from "@/components/tickets/ticket-filters";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { TicketForm } from "@/components/tickets/ticket-form";
import { TicketMetrics, type TicketTopClient } from "@/components/tickets/ticket-metrics";
import type { TicketWithRelations } from "@/lib/types/ticket";

export const metadata: Metadata = { title: "Tickets — WINF ERP" };

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const priority = typeof params.priority === "string" ? params.priority : "";

  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(
      `*, client:clients(id, first_name, last_name, business_name),
       inventory_item:inventory_items(id, serial_number, product:products(id, name))`
    )
    .order("created_at", { ascending: false });

  const tickets = (data ?? []) as unknown as TicketWithRelations[];

  const filtered = tickets.filter((ticket) => {
    if (status && ticket.status !== status) return false;
    if (priority && ticket.priority !== priority) return false;
    if (q) {
      const clientName = ticket.client
        ? `${ticket.client.first_name} ${ticket.client.last_name} ${ticket.client.business_name ?? ""}`
        : "";
      if (!clientName.toLowerCase().includes(q) && !ticket.subject.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const openCount = tickets.filter((t) => t.status === "abierto" || t.status === "en_proceso").length;

  const now = new Date();
  const thisMonthCount = tickets.filter((t) => {
    const created = new Date(t.created_at);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;

  const resolvedWithTime = tickets.filter(
    (t) => (t.status === "resuelto" || t.status === "cerrado") && t.time_spent_minutes != null
  );
  const avgResolutionMinutes =
    resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, t) => sum + (t.time_spent_minutes ?? 0), 0) / resolvedWithTime.length
      : null;

  const countByClient = new Map<string, TicketTopClient>();
  for (const ticket of tickets) {
    if (!ticket.client) continue;
    const existing = countByClient.get(ticket.client_id);
    const name = `${ticket.client.first_name} ${ticket.client.last_name}`;
    if (existing) existing.count += 1;
    else countByClient.set(ticket.client_id, { clientId: ticket.client_id, name, count: 1 });
  }
  const topClients = Array.from(countByClient.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "ticket" : "tickets"}
          </p>
        </div>
        <TicketForm />
      </div>

      <TicketMetrics
        openCount={openCount}
        thisMonthCount={thisMonthCount}
        avgResolutionMinutes={avgResolutionMinutes}
        topClients={topClients}
      />

      <TicketFilters />

      <TicketsTable tickets={filtered} />
    </div>
  );
}
