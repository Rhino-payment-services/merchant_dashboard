"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { UGANDAN_BANKS } from "@/app/lib/bankList"

type BankComboboxProps = {
  value?: string
  onValueChange: (bankSortCode: string, bankName: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function BankCombobox({
  value,
  onValueChange,
  placeholder = "Choose bank",
  disabled,
  className,
}: BankComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedBank = UGANDAN_BANKS.find((b) => b.bankSortCode === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedBank && "text-muted-foreground",
            className
          )}
        >
          {selectedBank ? selectedBank.bankName : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search bank..." />
          <CommandList>
            <CommandEmpty>No bank found.</CommandEmpty>
            <CommandGroup>
              {UGANDAN_BANKS.map((bank) => (
                <CommandItem
                  key={bank.bankSortCode}
                  value={`${bank.bankName} ${bank.bankSortCode}`}
                  onSelect={() => {
                    onValueChange(bank.bankSortCode, bank.bankName)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === bank.bankSortCode ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {bank.bankName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
