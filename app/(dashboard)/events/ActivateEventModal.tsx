"use client"

import React from "react"
import { CircleCheckBig } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ActivateEventModalProps = {
  open: boolean
  eventTitle?: string
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ActivateEventModal({
  open,
  eventTitle,
  loading,
  onOpenChange,
  onConfirm,
}: ActivateEventModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[27rem] p-0 border-0 gap-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">Activate event confirmation</DialogTitle>
          <div className="min-h-[20rem] rounded flex flex-col gap-5 items-center justify-center w-full bg-white p-6">
            <div className="h-20 w-20 rounded-full flex items-center justify-center bg-neutral-100">
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-neutral-300">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-neutral-900">
                  <div className="h-6 w-6 flex items-center justify-center rounded-full bg-neutral-100">
                    <CircleCheckBig className="w-3.5 h-3.5 text-neutral-900" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-col text-center">
              <span className="text-[18px]">Activate this event?</span>
              <div className="text-[13px] mt-1 text-neutral-700">
                <span>
                  This will change the status from DRAFT to ACTIVE
                  {eventTitle ? ` for "${eventTitle}".` : "."}
                </span>
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
                {loading ? "Activating..." : "Activate"}
              </Button>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
