import type { LucideIcon } from "lucide-react";

export const StatTile = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div className="rounded-xl border border-border bg-muted/40 p-3">
    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5" />
      {label}
    </div>
    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
  </div>
);
