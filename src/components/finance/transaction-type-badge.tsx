import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TRANSACTION_TYPE_LABEL } from "@/lib/finance/labels";
import type { TransactionType } from "@/lib/types/finance";

const TYPE_CLASS: Record<TransactionType, string> = {
  ingreso: "border-transparent bg-primary/15 text-primary",
  egreso: "border-transparent bg-destructive/15 text-destructive",
};

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge className={cn(TYPE_CLASS[type])} variant="outline">
      {TRANSACTION_TYPE_LABEL[type]}
    </Badge>
  );
}
