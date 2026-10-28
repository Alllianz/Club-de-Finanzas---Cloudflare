"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-[var(--color-muted)] [&_.recharts-cartesian-grid_line]:stroke-[var(--color-line)] [&_.recharts-curve.recharts-tooltip-cursor]:stroke-[var(--color-line)] [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none",
          className,
        )}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  className,
  formatter,
}: {
  active?: boolean;
  payload?: Array<Record<string, unknown>>;
  className?: string;
  formatter?: (
    value: number,
    name: string,
    item: Record<string, unknown>,
    index: number,
    payload: Array<Record<string, unknown>>,
  ) => React.ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className={cn("grid min-w-[8rem] items-start gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl", className)}>
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? "");
        const itemConfig = config[key] ?? config[String(item.name ?? "")];
        const value = Number(item.value ?? 0);
        const label = itemConfig?.label ?? String(item.name ?? "");

        return (
          <div key={`${item.dataKey}-${item.name}-${index}`} className="grid gap-0.5">
            {formatter ? (
              formatter(value, String(label ?? ""), item, index, payload)
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{String(label)}</span>
                <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
