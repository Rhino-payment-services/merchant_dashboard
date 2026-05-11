"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, TicketCheck, UserRoundCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  checkInTicket,
  getMerchantEventById,
  CheckInTicketError,
  type CheckInTicketResponse,
} from "@/lib/api/merchant-events.api"
import { getCheckInErrorMessage } from "@/lib/utils/check-in-errors"

const TICKET_PATTERN = /^TKT-[A-Z0-9]+$/i
const EVENT_ID_PATTERN = /^[a-zA-Z0-9-]{6,}$/

function normalizeTicket(raw: string): string {
  return raw.trim().toUpperCase()
}

function parseErrorMessage(error: unknown): string {
  const fallback = "Check-in failed. Please try again."
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return error instanceof Error ? error.message : fallback
  }

  const e = error as {
    response?: {
      status?: number
      data?: { message?: string | string[] }
    }
  }

  const status = e.response?.status
  const rawMessage = e.response?.data?.message
  const apiMessage =
    typeof rawMessage === "string"
      ? rawMessage
      : Array.isArray(rawMessage) && rawMessage.length
        ? rawMessage.join(", ")
        : ""

  if (status === 404) return apiMessage || "Ticket not found for this event."
  if (status === 409) return apiMessage || "This ticket is already checked in."
  if (status === 403) return apiMessage || "You do not have permission to check in this ticket."
  if (status === 422) return apiMessage || "Invalid ticket code format."
  if (status === 400) {
    const msg = apiMessage.toLowerCase()
    if (msg.includes("window")) return "Check-in window is currently closed."
    if (msg.includes("cancel")) return "This ticket has been cancelled."
    if (msg.includes("void")) return "This ticket has been voided."
    if (msg.includes("event")) return "This ticket does not belong to this event."
    return apiMessage || "This ticket is not valid for check-in."
  }

  return apiMessage || fallback
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Just now"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "Just now"
  return new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short" }).format(d)
}

export default function MerchantEventCheckInPage() {
  const params = useParams<{ eventCode?: string }>()
  const searchParams = useSearchParams()

  const eventId = typeof params?.eventCode === "string" ? params.eventCode : ""
  const decodedTicket = useMemo(() => {
    const raw = searchParams.get("ticket") || ""
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }, [searchParams])
  const ticketCode = useMemo(() => normalizeTicket(decodedTicket), [decodedTicket])

  const [eventTitle, setEventTitle] = useState<string>("")
  const [eventLoading, setEventLoading] = useState(false)
  const [eventLoadError, setEventLoadError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [result, setResult] = useState<CheckInTicketResponse | null>(null)

  const hasTicket = ticketCode.length > 0
  const eventIdValid = EVENT_ID_PATTERN.test(eventId)
  const ticketFormatValid = TICKET_PATTERN.test(ticketCode)

  useEffect(() => {
    let cancelled = false
    if (!eventIdValid) return

    setEventLoading(true)
    setEventLoadError("")
    void getMerchantEventById(eventId)
      .then((evt) => {
        if (cancelled) return
        setEventTitle(evt.title || "")
      })
      .catch(() => {
        if (cancelled) return
        setEventLoadError("Could not load event details. You can still attempt check-in.")
      })
      .finally(() => {
        if (!cancelled) setEventLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [eventId, eventIdValid])

  async function handleCheckIn() {
    if (submitting || result) return
    if (!eventIdValid) return

    if (!hasTicket) {
      setSubmitError("Missing ticket code in the URL. Please open this page from a valid ticket link.")
      return
    }
    if (!ticketFormatValid) {
      setSubmitError("Invalid ticket format. Expected format is TKT-XXXX.")
      return
    }

    setSubmitting(true)
    setSubmitError("")
    try {
      const response = await checkInTicket(eventId, { ticketCode })
      setResult(response)
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(120)
      }
      toast.success(response.message || `Checked in: ${response.attendeeName}`)
      if (response.warning) {
        toast.warning(response.warning)
      }
    } catch (error) {
      const message =
        error instanceof CheckInTicketError
          ? getCheckInErrorMessage(error.errorCode, error.body)
          : parseErrorMessage(error)
      setSubmitError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const blockedMessage = !eventId
    ? "Missing event ID in URL."
    : !eventIdValid
      ? "Malformed event ID. Please check the link and try again."
      : !hasTicket
        ? "Missing ticket code. Add ?ticket=TKT-... to this URL."
        : !ticketFormatValid
          ? "Invalid ticket code format. Expected TKT-XXXX."
          : ""

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 sm:py-10">
      <Card>
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit">
            Merchant check-in
          </Badge>
          <CardTitle className="text-2xl leading-tight">Event Ticket Check-in</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Confirm attendee arrival at the gate by checking in this ticket.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <section className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">Event</p>
            <p className="mt-1 text-base font-semibold break-words">
              {eventTitle || eventId || "Unknown event"}
            </p>
            {eventLoading ? (
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading event details...
              </p>
            ) : null}
            {eventLoadError ? <p className="mt-1 text-xs text-muted-foreground">{eventLoadError}</p> : null}
          </section>

          <section className="rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Ticket code</p>
            <p className="mt-1 break-all font-mono text-base sm:text-lg">{ticketCode || "—"}</p>
          </section>

          {blockedMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                Cannot proceed
              </div>
              <p className="mt-1">{blockedMessage}</p>
            </div>
          ) : null}

          {submitError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                Check-in failed
              </div>
              <p className="mt-1">{submitError}</p>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-md border border-green-600/30 bg-green-50 p-3 text-sm text-green-900">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Check-in successful
              </div>
              <p className="mt-2 flex items-center gap-2">
                <UserRoundCheck className="h-4 w-4" />
                <span className="font-semibold">{result.attendeeName || "Attendee"}</span>
              </p>
              <p className="mt-1">Tier: {result.tierName || "—"}</p>
              <p className="mt-1">Checked in at: {formatDateTime(result.checkedInAt)}</p>
              {result.warning ? (
                <p className="mt-2 text-xs text-amber-800">Note: {result.warning}</p>
              ) : null}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={() => void handleCheckIn()}
            disabled={Boolean(blockedMessage) || submitting || Boolean(result)}
            className="h-12 w-full text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking in...
              </>
            ) : result ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Already checked in
              </>
            ) : (
              <>
                <TicketCheck className="mr-2 h-4 w-4" />
                Check in attendee
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
