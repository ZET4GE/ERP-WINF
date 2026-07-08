"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { whatsAppLink } from "@/lib/phone";
import { buildConfirmationMessage } from "@/lib/appointments/whatsapp";
import type { AppointmentType } from "@/lib/types/appointment";

export function WhatsAppConfirmDialog({
  phone,
  clientFirstName,
  type,
  startAt,
}: {
  phone: string | null;
  clientFirstName: string;
  type: AppointmentType;
  startAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(() =>
    buildConfirmationMessage({ clientFirstName, type, startAt })
  );

  if (!phone) return null;

  function handleSend() {
    window.open(whatsAppLink(phone!, message), "_blank", "noreferrer");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setMessage(buildConfirmationMessage({ clientFirstName, type, startAt }));
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <MessageCircle />
        Confirmar por WhatsApp
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar turno por WhatsApp</DialogTitle>
          <DialogDescription>
            Editá el mensaje si hace falta antes de enviarlo.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <DialogFooter>
          <Button onClick={handleSend}>
            <MessageCircle />
            Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
