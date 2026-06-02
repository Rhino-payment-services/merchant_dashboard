"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import { todayLocal, toIsoDateLocal } from "@/lib/date-picker-utils"

export type DateRangePickerProps = {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onClear?: () => void
  fromLabel?: string
  toLabel?: string
  /** `inline` = single row for toolbars; `default` = stacked labels per field */
  layout?: "default" | "inline"
  className?: string
  disableFuture?: boolean
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  fromLabel = "From",
  toLabel = "To",
  layout = "default",
  className,
  disableFuture = true,
}: DateRangePickerProps) {
  const todayIso = toIsoDateLocal(todayLocal())

  const handleFromChange = (value: string) => {
    onFromChange(value)
    if (value && to && to < value) {
      onToChange(value)
    }
  }

  const handleToChange = (value: string) => {
    if (value && from && value < from) {
      onToChange(from)
      return
    }
    onToChange(value)
  }

  if (layout === "inline") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5",
          className,
        )}
      >
        <DatePicker
          size="compact"
          value={from}
          onChange={handleFromChange}
          placeholder="From"
          disableFuture={disableFuture}
          maxDate={todayIso}
        />
        <span className="px-0.5 text-xs text-gray-400">–</span>
        <DatePicker
          size="compact"
          value={to}
          onChange={handleToChange}
          placeholder="To"
          disableFuture={disableFuture}
          maxDate={todayIso}
          minDate={from || undefined}
        />
        {(from || to) && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-xs text-gray-600"
            onClick={onClear}
          >
            Clear
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <div className="min-w-[160px] flex-1">
        {fromLabel ? (
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {fromLabel}
          </label>
        ) : null}
        <DatePicker
          value={from}
          onChange={handleFromChange}
          placeholder="Start date"
          disableFuture={disableFuture}
          maxDate={todayIso}
          minDate={undefined}
        />
      </div>
      <span className="hidden pb-2 text-sm text-gray-400 sm:inline">to</span>
      <div className="min-w-[160px] flex-1">
        {toLabel ? (
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {toLabel}
          </label>
        ) : null}
        <DatePicker
          value={to}
          onChange={handleToChange}
          placeholder="End date"
          disableFuture={disableFuture}
          maxDate={todayIso}
          minDate={from || undefined}
        />
      </div>
      {(from || to) && onClear ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mb-0.5 h-9"
          onClick={onClear}
        >
          Clear
        </Button>
      ) : null}
    </div>
  )
}
