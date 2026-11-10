"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { FieldError, FieldHint } from "@/components/ui/field-message"

/** Floating labels notch the border with `--field-bg` (default white). Set it on an ancestor when the field sits on another surface. */
export type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: "floating" | "standard"
  label?: string
  /** Standard variant only, rendered at the end of the label row (e.g. a "Forgot password?" link). */
  labelAside?: React.ReactNode
  hint?: string
  error?: string
  leadingIcon?: React.ReactNode
  trailing?: React.ReactNode
  /** Defaults to true for `type="password"`. */
  passwordToggle?: boolean
  containerClassName?: string
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      variant = "standard",
      label,
      labelAside,
      hint,
      error,
      leadingIcon,
      trailing,
      passwordToggle,
      containerClassName,
      className,
      id,
      type = "text",
      placeholder,
      disabled,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`

    const isFloating = variant === "floating" && !!label
    const isPassword = type === "password"
    const showToggle = isPassword && (passwordToggle ?? true)
    const [passwordVisible, setPasswordVisible] = React.useState(false)
    const inputType = isPassword && passwordVisible ? "text" : type

    const trailingContent =
      trailing ??
      (showToggle ? (
        <button
          type="button"
          onClick={() => setPasswordVisible((visible) => !visible)}
          disabled={disabled}
          aria-label={passwordVisible ? "Hide password" : "Show password"}
          aria-pressed={passwordVisible}
          aria-controls={inputId}
          className="flex h-full w-11 cursor-pointer items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-slate-700 focus-visible:text-primary focus-visible:outline-none disabled:pointer-events-none"
        >
          {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      ) : null)

    const describedBy =
      [ariaDescribedBy, error ? errorId : hint ? hintId : undefined].filter(Boolean).join(" ") || undefined

    return (
      <div className={cn("w-full", containerClassName)}>
        {!isFloating && label && (
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label
              htmlFor={inputId}
              className={cn("block text-sm font-medium text-slate-700", error && "text-error")}
            >
              {label}
            </label>
            {labelAside}
          </div>
        )}

        <div className="group relative">
          {leadingIcon && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary [&_svg]:size-4"
            >
              {leadingIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            placeholder={isFloating ? placeholder || " " : placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "peer flex w-full rounded-lg border border-slate-200 bg-[color:var(--field-bg,#fff)] px-3.5 text-[15px] text-slate-900 transition-[border-color,box-shadow] duration-150",
              "placeholder:text-slate-400 hover:border-slate-300",
              "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/10",
              "autofill:shadow-[inset_0_0_0_1000px_var(--field-bg,#fff)]",
              "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:border-slate-200",
              isFloating ? "h-12 placeholder:text-transparent focus:placeholder:text-slate-400" : "h-11",
              leadingIcon && "pl-10",
              trailingContent && "pr-11",
              error &&
                "border-error hover:border-error focus-visible:border-error focus-visible:ring-error/15",
              className
            )}
            {...props}
          />

          {isFloating && (
            <label
              htmlFor={inputId}
              className={cn(
                "pointer-events-none absolute max-w-[calc(100%-3.5rem)] -translate-y-1/2 truncate rounded-sm px-1 transition-all duration-200 ease-out",
                "left-2.5 top-0 bg-[color:var(--field-bg,#fff)] text-xs text-slate-500",
                "peer-placeholder-shown:top-1/2 peer-placeholder-shown:bg-transparent peer-placeholder-shown:text-[15px]",
                leadingIcon && "peer-placeholder-shown:left-9",
                "peer-autofill:left-2.5 peer-autofill:top-0 peer-autofill:bg-[color:var(--field-bg,#fff)] peer-autofill:text-xs",
                "peer-focus:left-2.5 peer-focus:top-0 peer-focus:bg-[color:var(--field-bg,#fff)] peer-focus:text-xs peer-focus:text-primary",
                "peer-disabled:text-slate-400",
                error && "text-error peer-focus:text-error"
              )}
            >
              {label}
            </label>
          )}

          {trailingContent && (
            <div className="absolute inset-y-0 right-0 flex items-center">{trailingContent}</div>
          )}
        </div>

        <FieldError id={errorId} message={error} />
        {!error && <FieldHint id={hintId} message={hint} />}
      </div>
    )
  }
)
TextField.displayName = "TextField"

export { TextField }
