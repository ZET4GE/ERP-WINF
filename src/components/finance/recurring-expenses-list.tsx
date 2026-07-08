"use client";

import { useTransition } from "react";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RecurringExpenseForm } from "@/components/finance/recurring-expense-form";
import {
  deleteRecurringExpense,
  toggleRecurringExpenseActive,
} from "@/app/(dashboard)/finanzas/actions";
import { formatCurrency } from "@/lib/format";
import type { ExpenseCategory, RecurringExpenseWithRelations } from "@/lib/types/finance";

export function RecurringExpensesList({
  recurringExpenses,
  categories,
}: {
  recurringExpenses: RecurringExpenseWithRelations[];
  categories: ExpenseCategory[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleRecurringExpenseActive(id, active);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(active ? "Gasto recurrente activado" : "Gasto recurrente desactivado");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteRecurringExpense(id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Gasto recurrente borrado");
    });
  }

  if (recurringExpenses.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="No hay gastos recurrentes"
        description="Se crean automáticamente al dar de alta un contrato con suscripción, o cargalos manualmente."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {recurringExpenses.map((expense) => (
        <Card key={expense.id} size="sm" className={!expense.active ? "opacity-60" : undefined}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium">{expense.name}</span>
                {expense.category && (
                  <Badge variant="secondary">{expense.category.name}</Badge>
                )}
                {expense.contract && (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {expense.contract.client.first_name} {expense.contract.client.last_name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(expense.amount, expense.currency)} / mes — día {expense.day_of_month}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Switch
                checked={expense.active}
                onCheckedChange={(checked) => handleToggle(expense.id, checked)}
                disabled={isPending}
              />
              <RecurringExpenseForm
                recurringExpense={expense}
                categories={categories}
                trigger={
                  <Button variant="ghost" size="icon-sm">
                    <Pencil />
                  </Button>
                }
              />
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" disabled={isPending} />
                  }
                >
                  <Trash2 />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Borrar gasto recurrente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará &quot;{expense.name}&quot;. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => handleDelete(expense.id)}
                      disabled={isPending}
                    >
                      Borrar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
