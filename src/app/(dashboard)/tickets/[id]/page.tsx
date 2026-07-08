import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { TicketDetailView } from "@/components/tickets/ticket-detail-view";
import type { TicketWithRelations, TicketUpdateWithAuthor } from "@/lib/types/ticket";

export const metadata: Metadata = { title: "Ticket — WINF ERP" };

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: ticket }, { data: updates }] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        `*, client:clients(id, first_name, last_name, business_name),
         inventory_item:inventory_items(id, serial_number, product:products(id, name))`
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ticket_updates")
      .select(`*, author:profiles(id, full_name)`)
      .eq("ticket_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!ticket) notFound();

  return (
    <TicketDetailView
      ticket={ticket as unknown as TicketWithRelations}
      updates={(updates ?? []) as unknown as TicketUpdateWithAuthor[]}
    />
  );
}
