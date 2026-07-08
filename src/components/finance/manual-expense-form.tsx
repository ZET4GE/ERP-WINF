"use client";

import { useRef, useState, useTransition, type ReactElement } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createManualExpense } from "@/app/(dashboard)/finanzas/actions";
import type { ExpenseCategory } from "@/lib/types/finance";

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ManualExpenseForm({
  categories,
  trigger,
}: {
  categories: ExpenseCategory[];
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");

  function resetForm() {
    setCategoryId(categories[0]?.id ?? "");
    setAmount(0);
    setCurrency("ARS");
    setDate(todayISO());
    setDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit() {
    if (!categoryId || amount <= 0 || !date) {
      toast.error("Completá categoría, monto y fecha");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("category_id", categoryId);
      formData.set("amount", String(amount));
      formData.set("currency", currency);
      formData.set("date", date);
      formData.set("description", description);
      const file = fileInputRef.current?.files?.[0];
      if (file) formData.set("file", file);

      const result = await createManualExpense(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Gasto registrado");
      setOpen(false);
      resetForm();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button size="sm" />}>
        {!trigger && (
          <>
            <Plus />
            Nuevo gasto
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo gasto manual</DialogTitle>
          <DialogDescription>
            Materiales, equipos, combustible, herramientas u otros gastos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Monto</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as "ARS" | "USD")}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Fecha</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descripción (opcional)</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Adjunto (opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="text-sm text-muted-foreground file:mr-3 file:h-8 file:rounded-lg file:border file:border-input file:bg-transparent file:px-2.5 file:text-sm file:font-medium file:text-foreground"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Guardando..." : "Registrar gasto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
