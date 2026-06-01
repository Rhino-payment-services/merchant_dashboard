"use client"

import * as React from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  addMonths,
  buildMonthGrid,
  compareIsoDates,
  formatIsoDateCompact,
  formatIsoDateDisplay,
  getWeekdayLabels,
  monthYearLabel,
  parseIsoDateLocal,
  todayLocal,
  toIsoDateLocal,
} from "@/lib/date-picker-utils"

export type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Block dates after today (default true for transaction history). */
  disableFuture?: boolean
  /** Block dates before today. */
  disablePast?: boolean
  /** Earliest selectable date (YYYY-MM-DD). */
  minDate?: string
  /** Latest selectable date (YYYY-MM-DD). */
  maxDate?: string
  className?: string
  id?: string
  disabled?: boolean
  align?: "start" | "center" | "end"
  /** Compact width for filter toolbars (default `default`). */
  size?: "default" | "compact"
}

function isDateSelectable(
  iso: string,
  options: {
    disableFuture: boolean
    disablePast: boolean
    minDate?: string
    maxDate?: string
    todayIso: string
  },
): boolean {
  if (options.disableFuture && compareIsoDates(iso, options.todayIso) > 0) {
    return false
  }
  if (options.disablePast && compareIsoDates(iso, options.todayIso) < 0) {
    return false
  }
  if (options.minDate && compareIsoDates(iso, options.minDate) < 0) {
    return false
  }
  if (options.maxDate && compareIsoDates(iso, options.maxDate) > 0) {
    return false
  }
  return true
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disableFuture = true,
  disablePast = false,
  minDate,
  maxDate,
  className,
  id,
  disabled = false,
  align = "start",
  size = "default",
}: DatePickerProps) {
  const isCompact = size === "compact"
  const today = React.useMemo(() => todayLocal(), [])
  const todayIso = React.useMemo(() => toIsoDateLocal(today), [today])
  const effectiveMaxDate =
    maxDate ?? (disableFuture ? todayIso : undefined)

  const selectedDate = React.useMemo(
    () => (value ? parseIsoDateLocal(value) : null),
    [value],
  )

  const [open, setOpen] = React.useState(false)
  const [viewMonth, setViewMonth] = React.useState<Date>(
    () => selectedDate ?? today,
  )

  React.useEffect(() => {
    if (open && selectedDate) {
      setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
    }
  }, [open, selectedDate])

  const selectability = React.useMemo(
    () => ({
      disableFuture,
      disablePast,
      minDate,
      maxDate: effectiveMaxDate,
      todayIso,
    }),
    [disableFuture, disablePast, minDate, effectiveMaxDate, todayIso],
  )

  const cells = React.useMemo(() => buildMonthGrid(viewMonth), [viewMonth])
  const weekdays = getWeekdayLabels()

  const canGoNextMonth = React.useMemo(() => {
    if (!disableFuture) return true
    const nextMonthStart = addMonths(viewMonth, 1)
    const nextMonthEndIso = toIsoDateLocal(
      new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth() + 1, 0),
    )
    return compareIsoDates(nextMonthEndIso, todayIso) >= 0
  }, [viewMonth, disableFuture, todayIso])

  const handleSelect = (iso: string) => {
    if (!isDateSelectable(iso, selectability)) return
    onChange(iso)
    setOpen(false)
  }

  const handleToday = () => {
    if (!isDateSelectable(todayIso, selectability)) return
    onChange(todayIso)
    setOpen(false)
  }

  const handleClear = () => {
    onChange("")
    setOpen(false)
  }

  const displayLabel = value
    ? isCompact
      ? formatIsoDateCompact(value)
      : formatIsoDateDisplay(value)
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            isCompact
              ? "h-8 w-[8.75rem] max-w-[8.75rem] shrink-0 px-2 text-xs"
              : "h-9 w-full px-3",
            !value && "text-gray-500",
            className,
          )}
        >
          <CalendarIcon
            className={cn(
              "shrink-0 opacity-70",
              isCompact ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4",
            )}
          />
          <span className="truncate">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align={align}>
        <div className="flex items-center justify-between mb-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-[#08163d]">
            {monthYearLabel(viewMonth)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canGoNextMonth}
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map((label) => (
            <div
              key={label}
              className="text-center text-[0.7rem] font-medium text-gray-500"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const selectable = isDateSelectable(cell.iso, selectability)
            const isSelected = value === cell.iso
            const isToday = cell.iso === todayIso

            return (
              <button
                key={cell.iso + (cell.inMonth ? "in" : "out")}
                type="button"
                disabled={!selectable}
                onClick={() => handleSelect(cell.iso)}
                className={cn(
                  "h-9 w-9 rounded-md text-sm transition-colors",
                  !cell.inMonth && "text-gray-400",
                  cell.inMonth && selectable && "hover:bg-gray-100",
                  !selectable && "cursor-not-allowed opacity-40",
                  isSelected &&
                    "bg-[#08163d] text-white hover:bg-[#08163d] hover:text-white",
                  !isSelected &&
                    isToday &&
                    selectable &&
                    "border border-[#08163d] font-semibold",
                )}
              >
                {cell.date.getDate()}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-600"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={!isDateSelectable(todayIso, selectability)}
            onClick={handleToday}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
