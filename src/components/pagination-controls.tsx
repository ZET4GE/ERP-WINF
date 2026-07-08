import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  pageCount,
  total,
  buildHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "cliente" : "clientes"} · página {page} de{" "}
        {pageCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          render={<Link href={buildHref(page - 1)} scroll={false} />}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          render={<Link href={buildHref(page + 1)} scroll={false} />}
        >
          Siguiente
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
