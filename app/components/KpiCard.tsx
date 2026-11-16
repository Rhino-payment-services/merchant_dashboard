"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  changeType?: "up" | "down" | "neutral";
  valueClassName?: string;
  children?: ReactNode;
};

export default function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  changeType = "neutral",
  valueClassName,
  children,
}: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-1.5 text-gray-500">
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span className="text-[12px] font-medium leading-none">{label}</span>
      </div>

      {hint && (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-0.5 text-[11px] font-medium leading-snug",
            changeType === "up" && "text-emerald-600",
            changeType === "down" && "text-rose-500",
            changeType === "neutral" && "text-gray-400",
          )}
        >
          {changeType === "up" && (
            <ArrowUpRight className="h-3 w-3 shrink-0" strokeWidth={2} />
          )}
          {changeType === "down" && (
            <ArrowDownRight className="h-3 w-3 shrink-0" strokeWidth={2} />
          )}
          <span className="truncate">{hint}</span>
        </p>
      )}

      <div
        className={cn(
          "mt-2.5 flex items-baseline gap-1.5 text-[22px] font-semibold tracking-tight text-gray-900 tabular-nums",
          valueClassName,
        )}
      >
        {suffix && (
          <span className="text-[12px] font-medium text-gray-400">{suffix}</span>
        )}
        <span className="truncate leading-none">{value}</span>
      </div>
      {children}
    </div>
  );
}
