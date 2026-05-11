"use client"

import React, { useCallback, useEffect, useState } from "react"
import { CheckCircle2, QrCode, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { checkInTicket, CheckInTicketError, type CheckInTicketResponse } from "@/lib/api/merchant-events.api"
import { getCheckInErrorMessage } from "@/lib/utils/check-in-errors"

const TICKET_PATTERN = /^TKT-[A-Z0-9]+$/i

function normalizeTicketCode(raw: string): string {
  return raw.trim().toUpperCase()
}

function validateTicketCode(raw: string): string | null {
  const ticketCode = normalizeTicketCode(raw)
  if (!ticketCode) return "Ticket code is required."
  if (!TICKET_PATTERN.test(ticketCode)) return "Invalid format. Expected: TKT-XXXX."
  if (ticketCode.length > 64) return "Ticket code is too long."
  return null
}

function parseApiError(e: unknown): string {
  const fallback = "Check-in failed. Try again."
  if (typeof e !== "object" || e === null || !("response" in e)) {
    return e instanceof Error ? e.message : fallback
  }

  const err = e as {
    response?: {
      status?: number
      data?: { message?: string | string[] }
    }
  }

  const status = err.response?.status
  const msg = err.response?.data?.message
  const apiMessage =
    typeof msg === "string" ? msg : Array.isArray(msg) && msg.length ? msg.join(", ") : ""

  if (status === 409) return apiMessage || "Ticket is already checked in."
  if (status === 404) return apiMessage || "Ticket not found for this event."
  if (status === 403) return apiMessage || "You are not authorized to check in this ticket."
  if (status === 400) return apiMessage || "Ticket is not valid for check-in."
  if (status === 422) return apiMessage || "Invalid ticket payload."
  return apiMessage || fallback
}

type EventCheckInDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
  eventTitle?: string
  onCheckedIn?: () => void
}

export function EventCheckInDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onCheckedIn,
}: EventCheckInDialogProps) {
  const [manualCode, setManualCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CheckInTicketResponse | null>(null)
  const [error, setError] = useState("")

  const submitCheckIn = useCallback(
    async (incomingCode: string) => {
      if (!eventId) return

      const code = normalizeTicketCode(incomingCode)
      const validationError = validateTicketCode(code)
      if (validationError) {
        setError(validationError)
        toast.error(validationError)
        return
      }

      setSubmitting(true)
      setError("")
      try {
        const checkedIn = await checkInTicket(eventId, { ticketCode: code })
        setResult(checkedIn)
        setManualCode("")
        toast.success(checkedIn.message || `Ticket checked in: ${checkedIn.attendeeName}`)
        if (checkedIn.warning) {
          toast.warning(checkedIn.warning)
        }
        onCheckedIn?.()
      } catch (e) {
        const msg =
          e instanceof CheckInTicketError
            ? getCheckInErrorMessage(e.errorCode, e.body)
            : parseApiError(e)
        setError(msg)
        setResult(null)
        toast.error(msg)
      } finally {
        setSubmitting(false)
      }
    },
    [eventId, onCheckedIn]
  )

  useEffect(() => {
    if (!open) {
      setManualCode("")
      setSubmitting(false)
      setResult(null)
      setError("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Check in attendee
          </DialogTitle>
          <DialogDescription>
            Enter the ticket code for {eventTitle?.trim() || "this event"} to check in the attendee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 space-y-2">
            <Label htmlFor="manual-ticket-code">Ticket code</Label>
            <div className="flex gap-2">
              <Input
                id="manual-ticket-code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="TKT-XXXXXXXXXXXX"
                className="font-mono"
                disabled={submitting || !eventId}
              />
              <Button
                type="button"
                onClick={() => void submitCheckIn(manualCode)}
                disabled={submitting || !eventId}
              >
                {submitting ? "Checking..." : "Check in"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-medium">
                <ShieldAlert className="h-4 w-4" />
                Validation failed
              </div>
              <p className="mt-1">{error}</p>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-md border border-green-600/30 bg-green-50 p-3 text-sm text-green-900">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Ticket checked in
              </div>
              <p className="mt-1">
                <span className="font-semibold">{result.attendeeName}</span> • {result.tierName}
              </p>
              <p className="font-mono text-xs mt-1">{result.ticketCode}</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
