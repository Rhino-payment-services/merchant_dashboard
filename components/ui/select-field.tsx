"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { FieldError, FieldHint } from "@/components/ui/field-message"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type SelectFieldOption = { value: string; label: string }

export type SelectFieldProps = {
  id?: string
  label: string
  value: string
  onValueChange: (value: string) => void
  options: SelectFieldOption[]
  /** Shown inside the field only while the list is open and nothing is selected. */
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  containerClassName?: string
}

const SelectField = React.forwardRef<HTMLButtonElement, SelectFieldProps>(
  (
    { id, label, value, onValueChange, options, placeholder = "Select", error, hint, disabled, containerClassName },
    ref
  ) => {
    const generatedId = React.useId()
    const fieldId = id ?? generatedId
    const errorId = `${fieldId}-error`
    const hintId = `${fieldId}-hint`
    const [open, setOpen] = React.useState(false)
    const floated = !!value || open

    return (
      <div className={cn("w-full", containerClassName)}>
        <Select value={value} onValueChange={onValueChange} open={open} onOpenChange={setOpen} disabled={disabled}>
          <div className="relative">
            <SelectTrigger
              ref={ref}
              id={fieldId}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : hint ? hintId : undefined}
              className={cn(
                "peer h-12 rounded-lg border-slate-200 bg-[color:var(--field-bg,#fff)] px-3.5 text-[15px] text-slate-900 shadow-none transition-[border-color,box-shadow] duration-150",
                "hover:border-slate-300 focus:ring-0 focus:ring-offset-0 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10",
                "data-[state=open]:border-primary data-[state=open]:ring-[3px] data-[state=open]:ring-primary/10",
                "disabled:bg-slate-50 disabled:text-slate-400 [&>svg]:text-slate-400 [&>svg]:opacity-100",
                error &&
                  "border-error hover:border-error focus-visible:border-error focus-visible:ring-error/15 data-[state=open]:border-error data-[state=open]:ring-error/15"
              )}
            >
              <SelectValue placeholder={open ? placeholder : ""} />
            </SelectTrigger>

            <label
              htmlFor={fieldId}
              className={cn(
                "pointer-events-none absolute left-2.5 max-w-[calc(100%-3rem)] -translate-y-1/2 truncate rounded-sm px-1 transition-all duration-200 ease-out",
                floated
                  ? "top-0 bg-[color:var(--field-bg,#fff)] text-xs"
                  : "top-1/2 bg-transparent text-[15px]",
                error
                  ? "text-error"
                  : open
                    ? "text-primary"
                    : "text-slate-500 peer-focus-visible:text-primary",
                disabled && "text-slate-400"
              )}
            >
              {label}
            </label>
          </div>

          <SelectContent className="rounded-lg border-slate-200 shadow-lg">
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="cursor-pointer rounded-md py-2 text-sm focus:bg-slate-100 focus:text-primary data-[state=checked]:font-medium data-[state=checked]:text-primary"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <FieldError id={errorId} message={error} />
        {!error && <FieldHint id={hintId} message={hint} />}
      </div>
    )
  }
)
SelectField.displayName = "SelectField"

export { SelectField }
