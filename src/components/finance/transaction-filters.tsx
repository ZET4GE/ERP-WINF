"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSACTION_TYPES, TRANSACTION_ORIGINS } from "@/lib/types/finance";
import type { ExpenseCategory } from "@/lib/types/finance";
import { TRANSACTION_ORIGIN_LABEL, TRANSACTION_TYPE_LABEL } from "@/lib/finance/labels";

export function TransactionFilters({ categories }: { categories: ExpenseCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters =
    searchParams.get("tipo") ||
    searchParams.get("categoria") ||
    searchParams.get("origen") ||
    searchParams.get("desde") ||
    searchParams.get("hasta") ||
    searchParams.get("moneda");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Tipo</Label>
        <Select
          value={searchParams.get("tipo") ?? "all"}
          onValueChange={(v) => updateParams({ tipo: v === "all" ? null : v })}
        >
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TRANSACTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {TRANSACTION_TYPE_LABEL[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Categoría</Label>
        <Select
          value={searchParams.get("categoria") ?? "all"}
          onValueChange={(v) => updateParams({ categoria: v === "all" ? null : v })}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Origen</Label>
        <Select
          value={searchParams.get("origen") ?? "all"}
          onValueChange={(v) => updateParams({ origen: v === "all" ? null : v })}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Origen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TRANSACTION_ORIGINS.map((origin) => (
              <SelectItem key={origin} value={origin}>
                {TRANSACTION_ORIGIN_LABEL[origin]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Moneda</Label>
        <Select
          value={searchParams.get("moneda") ?? "all"}
          onValueChange={(v) => updateParams({ moneda: v === "all" ? null : v })}
        >
          <SelectTrigger className="sm:w-28">
            <SelectValue placeholder="Moneda" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="ARS">ARS</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Desde</Label>
        <Input
          type="date"
          className="sm:w-40"
          value={searchParams.get("desde") ?? ""}
          onChange={(e) => updateParams({ desde: e.target.value || null })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Hasta</Label>
        <Input
          type="date"
          className="sm:w-40"
          value={searchParams.get("hasta") ?? ""}
          onChange={(e) => updateParams({ hasta: e.target.value || null })}
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
