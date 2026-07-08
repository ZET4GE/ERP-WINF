"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boxes, FileText, Receipt, Search, Users } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { globalSearch, type GlobalSearchResults } from "@/app/(dashboard)/search-actions";

const EMPTY: GlobalSearchResults = {
  clients: [],
  contracts: [],
  inventoryItems: [],
  documents: [],
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const data = await globalSearch(query);
        setResults(data);
      });
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const hasResults =
    results.clients.length > 0 ||
    results.contracts.length > 0 ||
    results.inventoryItems.length > 0 ||
    results.documents.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-sm items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Buscar clientes, contratos, equipos...</span>
        <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Búsqueda global"
        description="Buscar clientes, contratos, equipos por S/N y documentos"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar clientes, contratos, S/N, documentos..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.trim().length < 2 ? (
              <CommandEmpty>Escribí al menos 2 caracteres para buscar.</CommandEmpty>
            ) : isPending ? (
              <CommandEmpty>Buscando...</CommandEmpty>
            ) : !hasResults ? (
              <CommandEmpty>Sin resultados.</CommandEmpty>
            ) : (
              <>
                {results.clients.length > 0 && (
                  <CommandGroup heading="Clientes">
                    {results.clients.map((item) => (
                      <CommandItem key={item.id} value={`client-${item.id}`} onSelect={() => navigate(item.href)}>
                        <Users />
                        <span>{item.title}</span>
                        {item.subtitle && (
                          <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {results.contracts.length > 0 && (
                  <CommandGroup heading="Contratos">
                    {results.contracts.map((item) => (
                      <CommandItem key={item.id} value={`contract-${item.id}`} onSelect={() => navigate(item.href)}>
                        <FileText />
                        <span>{item.title}</span>
                        {item.subtitle && (
                          <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {results.inventoryItems.length > 0 && (
                  <CommandGroup heading="Equipos (S/N)">
                    {results.inventoryItems.map((item) => (
                      <CommandItem key={item.id} value={`inventory-${item.id}`} onSelect={() => navigate(item.href)}>
                        <Boxes />
                        <span>{item.title}</span>
                        {item.subtitle && (
                          <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {results.documents.length > 0 && (
                  <CommandGroup heading="Documentos">
                    {results.documents.map((item) => (
                      <CommandItem key={item.id} value={`document-${item.id}`} onSelect={() => navigate(item.href)}>
                        <Receipt />
                        <span>{item.title}</span>
                        {item.subtitle && (
                          <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
