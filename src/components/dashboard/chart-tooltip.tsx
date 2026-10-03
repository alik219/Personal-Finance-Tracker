/** Tooltip rows: the value leads, the series name follows (dataviz spec). */
export type TooltipRow = { color: string; name: string; value: string };

export function ChartTooltip({
  title,
  rows,
}: {
  title?: string;
  rows: TooltipRow[];
}) {
  return (
    <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      {title && <p className="text-xs text-muted-foreground">{title}</p>}
      {rows.map((row) => (
        <div key={row.name} className="flex items-center gap-2">
          {/* A short line key, not a filled box. */}
          <span
            aria-hidden
            className="h-0.5 w-3 rounded-full"
            style={{ background: row.color }}
          />
          <span className="font-semibold tabular-nums">{row.value}</span>
          <span className="text-muted-foreground">{row.name}</span>
        </div>
      ))}
    </div>
  );
}
