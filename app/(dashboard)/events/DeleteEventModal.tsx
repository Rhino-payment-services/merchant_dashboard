"use client"

import React from "react"
import { Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type DeleteEventModalProps = {
  open: boolean
  eventTitle?: string
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteEventModal({
  open,
  eventTitle,
  loading,
  onOpenChange,
  onConfirm,
}: DeleteEventModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[27rem] p-0 border-0 gap-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">Delete event confirmation</DialogTitle>
          <div className="min-h-[20rem] rounded flex flex-col gap-5 items-center justify-center w-full bg-white p-6">
            <div className="h-20 w-20 rounded-full flex items-center justify-center bg-red-50">
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-red-700">
                  <div className="h-6 w-6 flex items-center justify-center rounded-full bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-col text-center">
              <span className="text-[18px] font-medium">Delete this event?</span>
              <div className="text-[13px] mt-1 text-neutral-700 max-w-[22rem]">
                <span>
                  This action cannot be undone. All associated data for this event may be removed
                  {eventTitle ? ` (“${eventTitle}”).` : "."}
                </span>
              </div>
            </div>

            <div className="flex flex-row justify-center gap-3 w-full">
              <Button
                variant="outline"
                className="w-32 cursor-pointer"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="w-32 bg-red-700 text-white hover:bg-red-700/90 cursor-pointer"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
