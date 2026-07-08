"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOCUMENT_TYPES, DOCUMENT_STATUSES } from "@/lib/types/document";
import { DOCUMENT_TYPE_LABEL, DOCUMENT_STATUS_LABEL } from "@/components/documents/document-status-badge";

export function DocumentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

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

  useEffect(() => {
    const handle = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) {
        updateParams({ q: q || null });
      }
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por cliente o número..."
          className="pl-8"
        />
      </div>

      <Select
        value={searchParams.get("doc_type") ?? "all"}
        onValueChange={(v) => updateParams({ doc_type: v === "all" ? null : v })}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          {DOCUMENT_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {DOCUMENT_TYPE_LABEL[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => updateParams({ status: v === "all" ? null : v })}
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {DOCUMENT_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {DOCUMENT_STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(e) => updateParams({ from: e.target.value || null })}
          className="sm:w-40"
        />
        <span className="text-sm text-muted-foreground">a</span>
        <Input
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => updateParams({ to: e.target.value || null })}
          className="sm:w-40"
        />
      </div>
    </div>
  );
}
