"use client"

import React from "react"
import { AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ConfirmLiquidationDestinationModalProps = {
  open: boolean
  loading?: boolean
  summary?: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ConfirmLiquidationDestinationModal({
  open,
  loading,
  summary,
  onOpenChange,
  onConfirm,
}: ConfirmLiquidationDestinationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[27rem] p-0 border-0 gap-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">
            Lock liquidation destination confirmation
          </DialogTitle>
          <div className="min-h-[20rem] rounded flex flex-col gap-5 items-center justify-center w-full bg-white p-6">
            <div className="h-20 w-20 rounded-full flex items-center justify-center bg-neutral-100">
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-neutral-300">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-neutral-900">
                  <div className="h-6 w-6 flex items-center justify-center rounded-full bg-neutral-100">
                    <AlertCircle className="w-3.5 h-3.5 text-neutral-900" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-col text-center">
              <span className="text-[18px]">Lock this liquidation destination?</span>
              <div className="text-[13px] mt-1 text-neutral-700 max-w-[22rem]">
                <span>
                  You can set this only once. After confirming, liquidations will
                  be locked to this destination and only an admin can change it.
                </span>
                {summary ? (
                  <span className="mt-2 block font-medium text-neutral-900">
                    {summary}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-row justify-center gap-3 w-full">
              <Button
                variant="outline"
                className="w-32"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="w-32 bg-black text-white hover:bg-black/90"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
