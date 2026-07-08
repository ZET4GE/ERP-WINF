"use client";

import { useState, useTransition, type ReactElement } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  createRecurringExpense,
  updateRecurringExpense,
} from "@/app/(dashboard)/finanzas/actions";
import type { ExpenseCategory, RecurringExpenseWithRelations } from "@/lib/types/finance";

export function RecurringExpenseForm({
  recurringExpense,
  categories,
  trigger,
}: {
  recurringExpense?: RecurringExpenseWithRelations;
  categories: ExpenseCategory[];
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(recurringExpense?.name ?? "");
  const [categoryId, setCategoryId] = useState(recurringExpense?.category_id ?? "none");
  const [amount, setAmount] = useState(recurringExpense?.amount ?? 0);
  const [currency, setCurrency] = useState<"ARS" | "USD">(recurringExpense?.currency ?? "ARS");
  const [dayOfMonth, setDayOfMonth] = useState(recurringExpense?.day_of_month ?? 1);
  const [active, setActive] = useState(recurringExpense?.active ?? true);

  function handleSubmit() {
    if (!name.trim() || amount <= 0) {
      toast.error("Completá nombre y monto");
      return;
    }

    startTransition(async () => {
      const values = {
        name: name.trim(),
        category_id: categoryId === "none" ? null : categoryId,
        amount,
        currency,
        day_of_month: dayOfMonth,
        active,
      };

      const result = recurringExpense
        ? await updateRecurringExpense(recurringExpense.id, values)
        : await createRecurringExpense(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(recurringExpense ? "Gasto recurrente actualizado" : "Gasto recurrente creado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button size="sm" />}>
        {!trigger && (
          <>
            <Plus />
            Nuevo gasto recurrente
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {recurringExpense ? "Editar gasto recurrente" : "Nuevo gasto recurrente"}
          </DialogTitle>
          <DialogDescription>
            Se genera automáticamente el día 1 de cada mes vía el cron mensual.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoría (opcional)</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
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
            <Label>Día del mes</Label>
            <Input
              type="number"
              min="1"
              max="28"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-2.5">
            <Label className="cursor-pointer" onClick={() => setActive((a) => !a)}>
              Activo
            </Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Guardando..." : recurringExpense ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
