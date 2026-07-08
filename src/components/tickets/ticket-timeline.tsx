"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addTicketUpdate } from "@/app/(dashboard)/tickets/actions";
import { formatDateTime } from "@/lib/format";
import type { TicketUpdateWithAuthor } from "@/lib/types/ticket";

export function TicketTimeline({
  ticketId,
  updates,
}: {
  ticketId: string;
  updates: TicketUpdateWithAuthor[];
}) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAddNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      const result = await addTicketUpdate(ticketId, { note });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setNote("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            placeholder="Agregar una nota..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div>
            <Button size="sm" disabled={isPending || !note.trim()} onClick={handleAddNote}>
              {isPending ? "Guardando..." : "Agregar nota"}
            </Button>
          </div>
        </div>

        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin actualizaciones todavía.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {updates.map((update) => (
              <div key={update.id} className="flex flex-col gap-0.5 border-l-2 border-muted pl-3">
                <p className="text-sm">{update.note}</p>
                <p className="text-xs text-muted-foreground">
                  {update.author?.full_name ?? "Sistema"} · {formatDateTime(update.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
