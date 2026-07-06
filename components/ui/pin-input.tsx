"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PinInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
  leftIcon?: React.ReactNode
}

export function PinInput({
  value,
  onChange,
  className,
  leftIcon,
  id,
  maxLength = 6,
  ...props
}: PinInputProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      {leftIcon && (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {leftIcon}
        </div>
      )}
      <Input
        id={id}
        type={visible ? "text" : "password"}
        inputMode="numeric"
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className={cn(leftIcon && "pl-10", "pr-10", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide PIN" : "Show PIN"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )
}
