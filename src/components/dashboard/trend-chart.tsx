"use client";

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { niceTicks } from "@/domain/reports/axis";

import { ChartTooltip } from "./chart-tooltip";

export type TrendRow = {
  /** Short month, e.g. "Oct". */
  label: string;
  /** Full month, e.g. "October 2026", for the tooltip. */
  title: string;
  income: number;
  spending: number;
  incomeLabel: string;
  spendingLabel: string;
};

const SERIES = [
  { key: "income", name: "Income", color: "var(--viz-series-1)" },
  { key: "spending", name: "Spending", color: "var(--viz-series-2)" },
] as const;

/** Income and spending per month: two lines, one shared y-axis. */
export function TrendChart({
  rows,
  currency,
}: {
  rows: TrendRow[];
  currency: string;
}) {
  const compact = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const last = rows.length - 1;
  // Round ticks (0 / 1,000 / 2,000) instead of Recharts' even splits.
  const ticks = niceTicks(
    Math.max(0, ...rows.flatMap((r) => [r.income, r.spending])),
  );

  return (
    <div className="grid gap-3">
      {/* Legend: line keys mirror the marks. */}
      <ul className="flex gap-4 text-sm text-muted-foreground" aria-hidden>
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ background: s.color }}
            />
            {s.name}
          </li>
        ))}
      </ul>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 8, right: 72, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              width={64}
              ticks={ticks}
              domain={[0, ticks.at(-1)!]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => compact.format(v)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              // The crosshair finds the month; one readout lists both series.
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as TrendRow | undefined;
                if (!active || !row) return null;
                return (
                  <ChartTooltip
                    title={row.title}
                    rows={SERIES.map((s) => ({
                      color: s.color,
                      name: s.name,
                      value:
                        s.key === "income"
                          ? row.incomeLabel
                          : row.spendingLabel,
                    }))}
                  />
                );
              }}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                // 8px dots with a 2px ring in the card surface color.
                dot={{
                  r: 4,
                  fill: s.color,
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 5,
                  fill: s.color,
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              >
                {/* Direct label on the latest point only. */}
                <LabelList
                  dataKey={s.key === "income" ? "incomeLabel" : "spendingLabel"}
                  content={({ x, y, value, index }) =>
                    index === last ? (
                      <text
                        x={Number(x) + 10}
                        y={Number(y)}
                        dy={4}
                        fontSize={12}
                        fill="var(--muted-foreground)"
                      >
                        {String(value)}
                      </text>
                    ) : null
                  }
                />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
