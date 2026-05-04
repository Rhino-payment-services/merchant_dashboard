"use client"

import React, { useEffect, useMemo, useState } from "react"
import { QrCode, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getEventAttendees,
  getEventCheckInStats,
  getMerchantEventUser,
  type EventAttendeeItem,
  type EventCheckInStatsResponse,
} from "@/lib/api/merchant-events.api"
import { EventCheckInStatsCard } from "./EventCheckInStatsCard"
import { EventCheckInDialog } from "./EventCheckInDialog"

const PAGE_SIZE = 20

const dateTimeFmt = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatOptionalDate(iso?: string | null) {
  if (!iso) return "—"
  try {
    return dateTimeFmt.format(new Date(iso))
  } catch {
    return "—"
  }
}

function attendeeStatusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" | "success" | "info" | "warning" | "danger" {
  const normalized = status.toUpperCase()
  if (normalized === "ACTIVE") return "info"
  if (normalized === "CHECKED_IN") return "success"
  if (normalized === "CONFIRMED") return "info"
  if (normalized === "PENDING") return "warning"
  if (normalized === "CANCELLED" || normalized === "REFUNDED") return "destructive"
  return "secondary"
}

function formatUserFullName(firstName?: string, lastName?: string): string {
  const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ")
  return fullName || "Unknown"
}

type EventAttendeesDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
  eventTitle?: string
}

export function EventAttendeesDrawer({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: EventAttendeesDrawerProps) {
  const [items, setItems] = useState<EventAttendeeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [checkInStats, setCheckInStats] = useState<EventCheckInStatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [userNameCache, setUserNameCache] = useState<Map<string, string>>(new Map())
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    if (!open) return
    setPage(1)
  }, [open, eventId])

  useEffect(() => {
    if (!open || !eventId) {
      setItems([])
      setLoadError(null)
      setLoading(false)
      setCheckInStats(null)
      setStatsLoading(false)
      setStatsError(null)
      setUserNameCache(new Map())
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setStatsLoading(true)
    setStatsError(null)

    void getEventAttendees(eventId, { page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return
        setItems(data.items ?? [])
        setPage(data.page)
        setTotalPages(Math.max(1, data.totalPages))
        setTotal(data.total)
      })
      .catch((e: unknown) => {
        console.error("Failed to load event attendees", e)
        if (cancelled) return
        setItems([])
        setLoadError("Could not load event attendees.")
        toast.error("Could not load event attendees.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    void getEventCheckInStats(eventId)
      .then((data) => {
        if (!cancelled) setCheckInStats(data)
      })
      .catch((e: unknown) => {
        console.error("Failed to load event check-in stats", e)
        if (cancelled) return
        setCheckInStats(null)
        setStatsError("Could not load check-in stats.")
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, eventId, page, reloadNonce])

  useEffect(() => {
    if (!open || !items.length) return

    const missingUserIds = Array.from(
      new Set(
        items
          .map((att) => att.checkedInBy?.trim())
          .filter((userId): userId is string => Boolean(userId && !userNameCache.has(userId)))
      )
    )

    if (!missingUserIds.length) return

    let cancelled = false

    void Promise.allSettled(
      missingUserIds.map(async (userId) => {
        try {
          const user = await getMerchantEventUser(userId)
          return [userId, formatUserFullName(user.firstName, user.lastName)] as const
        } catch {
          return [userId, "Unknown"] as const
        }
      })
    ).then((results) => {
      if (cancelled) return

      setUserNameCache((prev) => {
        const next = new Map(prev)
        for (const result of results) {
          if (result.status === "fulfilled") {
            const [userId, userName] = result.value
            next.set(userId, userName)
          }
        }
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [open, items, userNameCache])

  const title = useMemo(() => {
    if (eventTitle?.trim()) return `Attendees for ${eventTitle}`
    return "Event attendees"
  }, [eventTitle])

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-[100svh] min-h-[100svh] max-h-[100svh] w-full flex-col rounded-none p-0">
          <DrawerHeader className="border-b text-left relative pr-12">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>Tickets and check-in status for this event.</DrawerDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute right-14 top-3 h-8 gap-1.5"
              onClick={() => setCheckInDialogOpen(true)}
              disabled={!eventId}
            >
              <QrCode className="h-3.5 w-3.5" />
              Check in
            </Button>
            <DrawerClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 h-8 w-8"
                aria-label="Close attendees drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <EventCheckInStatsCard
              stats={checkInStats}
              loading={statsLoading}
              error={statsError}
            />

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
              <RefreshCw className="h-7 w-7 animate-spin" aria-hidden />
              <span className="text-sm">Loading attendees…</span>
            </div>
          ) : loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-600">No attendees found for this event yet.</p>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[56px] text-center">#</TableHead>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Attendee</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Checked in</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((att, idx) => (
                      <TableRow key={att.id}>
                        <TableCell className="text-center tabular-nums">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{att.ticketCode}</TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="font-medium">{att.attendeeName ?? "—"}</div>
                          <div className="text-xs text-gray-500">{att.attendeeEmail ?? "—"}</div>
                          <div className="text-xs text-gray-500">{att.attendeePhone ?? "—"}</div>
                        </TableCell>
                        <TableCell>{att.tierName ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{att.orderReference}</TableCell>
                        <TableCell>
                          <Badge variant={attendeeStatusBadgeVariant(att.status)}>
                            {att.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatOptionalDate(att.checkedInAt)}</TableCell>
                        <TableCell className="text-xs max-w-[140px]">
                          {att.checkedInBy?.trim()
                            ? (userNameCache.get(att.checkedInBy.trim()) ?? "Unknown")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{formatOptionalDate(att.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {total > 10 ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
                  <span>
                    Page {page} of {totalPages}
                    {total > 0 ? (
                      <span className="text-gray-400"> ({total.toLocaleString()} total)</span>
                    ) : null}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page <= 1 || loading}
                    >
                      First
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || loading}
                    >
                      Next
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages || loading}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
          </div>
        </DrawerContent>
      </Drawer>
      <EventCheckInDialog
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        eventId={eventId}
        eventTitle={eventTitle}
        onCheckedIn={() => {
          setPage(1)
          setReloadNonce((n) => n + 1)
        }}
      />
    </>
  )
}
