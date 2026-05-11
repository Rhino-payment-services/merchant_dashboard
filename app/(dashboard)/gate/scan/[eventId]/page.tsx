"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, TicketCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

function formatDateTime(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short" }).format(d)
}

export default function GateScanPage() {
  const params = useParams<{ eventId?: string }>()
  const eventId = typeof params?.eventId === "string" ? params.eventId : ""

  const [eventTitle, setEventTitle] = useState("")
  const [eventLoading, setEventLoading] = useState(false)
  const [eventLoadError, setEventLoadError] = useState("")

  const [manualCode, setManualCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [result, setResult] = useState<CheckInTicketResponse | null>(null)

  const eventIdValid = EVENT_ID_PATTERN.test(eventId)
  const ticketCode = normalizeTicket(manualCode)
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
        setEventLoadError(
          "Could not load event details. You may still try check-in if you have access."
        )
      })
      .finally(() => {
        if (!cancelled) setEventLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [eventId, eventIdValid])

  async function handleCheckIn() {
    if (submitting || !eventIdValid) return

    if (!ticketCode) {
      const msg = "Enter a ticket code."
      setSubmitError(msg)
      toast.error(msg)
      return
    }
    if (!ticketFormatValid) {
      const msg = "Invalid format. Expected TKT- followed by letters and numbers."
      setSubmitError(msg)
      toast.error(msg)
      return
    }

    setSubmitting(true)
    setSubmitError("")
    setResult(null)

    try {
      const response = await checkInTicket(eventId, { ticketCode })
      setResult(response)
      setManualCode("")
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(120)
      }
      toast.success(response.message || `Checked in: ${response.attendeeName}`)
      if (response.warning) {
        toast.warning(response.warning)
      }
    } catch (e: unknown) {
      if (e instanceof CheckInTicketError) {
        const msg = getCheckInErrorMessage(e.errorCode, e.body)
        setSubmitError(msg)
        toast.error(msg)
      } else {
        const msg = e instanceof Error ? e.message : "Check-in failed."
        setSubmitError(msg)
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const blockedMessage = !eventId
    ? "Missing event."
    : !eventIdValid
      ? "Invalid event link."
      : ""

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 sm:py-10">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
          <Link href="/gate/events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All assigned events
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit">
            Gate check-in
          </Badge>
          <CardTitle className="text-2xl leading-tight">Scan ticket</CardTitle>
          <CardDescription>
            Type or paste the ticket code. Use the same login you use for the dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <section className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">Event</p>
            <p className="mt-1 text-base font-semibold break-words">
              {eventTitle || eventId || "—"}
            </p>
            {eventLoading ? (
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </p>
            ) : null}
            {eventLoadError ? (
              <p className="mt-1 text-xs text-amber-700">{eventLoadError}</p>
            ) : null}
          </section>

          <div className="space-y-2">
            <Label htmlFor="gate-ticket-code">Ticket code</Label>
            <Input
              id="gate-ticket-code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="TKT-XXXXXXXX"
              className="font-mono uppercase"
              disabled={submitting || Boolean(blockedMessage)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleCheckIn()
                }
              }}
            />
          </div>

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
            <div className="rounded-md border border-green-600/30 bg-green-50 p-3 text-sm text-green-900 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {result.message || "Entry granted"}
              </div>
              <p>
                <span className="font-semibold">{result.attendeeName}</span>
                {result.tierName ? ` · ${result.tierName}` : null}
              </p>
              <p className="font-mono text-xs">{result.ticketCode}</p>
              <p className="text-xs">Checked in at {formatDateTime(result.checkedInAt)}</p>
              {result.warning ? (
                <p className="text-xs text-amber-800 border-t border-amber-200/60 pt-2 mt-2">
                  Note: {result.warning}
                </p>
              ) : null}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={() => void handleCheckIn()}
            disabled={Boolean(blockedMessage) || submitting}
            className="h-12 w-full text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                <TicketCheck className="mr-2 h-4 w-4" />
                Check in
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
