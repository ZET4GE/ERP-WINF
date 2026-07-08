"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resolveTicket } from "@/app/(dashboard)/tickets/actions";
import type { Ticket } from "@/lib/types/ticket";

export function ResolveTicketDialog({ ticket }: { ticket: Ticket }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [solution, setSolution] = useState(ticket.solution_applied ?? "");
  const [timeSpent, setTimeSpent] = useState(ticket.time_spent_minutes ?? 30);

  function handleSubmit() {
    if (!solution.trim() || timeSpent <= 0) {
      setError("Completá la solución aplicada y el tiempo invertido");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await resolveTicket(ticket.id, {
        solution_applied: solution,
        time_spent_minutes: timeSpent,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Ticket resuelto");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <CheckCircle2 />
        Resolver ticket
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolver ticket</DialogTitle>
          <DialogDescription>
            Registrá la solución aplicada y el tiempo invertido para medir el soporte real.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Solución aplicada</Label>
            <Textarea rows={3} value={solution} onChange={(e) => setSolution(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tiempo invertido (minutos)</Label>
            <Input
              type="number"
              min="1"
              value={timeSpent}
              onChange={(e) => setTimeSpent(Number(e.target.value) || 0)}
              className="max-w-32"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button disabled={isPending} onClick={handleSubmit}>
            {isPending ? "Guardando..." : "Marcar como resuelto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
