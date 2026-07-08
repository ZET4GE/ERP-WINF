import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function KpiCard({
  title,
  value,
  icon: Icon,
  hint,
  accent = false,
  href,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  accent?: boolean | "destructive";
  href?: string;
}) {
  const card = (
    <Card
      className={cn(
        "gap-2 py-5",
        href && "transition-colors hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 px-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "size-4 text-muted-foreground",
            accent === "destructive" && "text-destructive"
          )}
        />
      </CardHeader>
      <CardContent className="px-5">
        <div
          className={cn(
            "text-2xl font-semibold tracking-tight",
            accent === true && "text-primary",
            accent === "destructive" && "text-destructive"
          )}
        >
          {value}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block">
      {card}
    </Link>
  );
}
