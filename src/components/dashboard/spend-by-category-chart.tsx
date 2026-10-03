"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "./chart-tooltip";

export type CategoryBar = {
  key: string;
  name: string;
  /** Major units, for bar length only. */
  value: number;
  /** Exact formatted amount, e.g. "$1,234.50". */
  label: string;
};

const COLOR = "var(--viz-series-1)";
const ROW_HEIGHT = 36;

/**
 * Spending per category as horizontal bars: one series, so one hue and no
 * legend; the value sits at each bar's tip.
 */
export function SpendByCategoryChart({ bars }: { bars: CategoryBar[] }) {
  return (
    <div style={{ height: bars.length * ROW_HEIGHT + 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={bars}
          layout="vertical"
          margin={{ top: 4, right: 88, bottom: 4, left: 0 }}
          barCategoryGap={8}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="name"
            width={128}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--foreground)", fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, payload }) => {
              const bar = payload?.[0]?.payload as CategoryBar | undefined;
              if (!active || !bar) return null;
              return (
                <ChartTooltip
                  rows={[{ color: COLOR, name: bar.name, value: bar.label }]}
                />
              );
            }}
          />
          <Bar
            dataKey="value"
            fill={COLOR}
            barSize={20}
            // Rounded data end, square at the baseline.
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="label"
              position="right"
              style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
