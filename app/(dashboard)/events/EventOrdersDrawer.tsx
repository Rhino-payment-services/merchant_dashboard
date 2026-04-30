"use client"

import React, { useEffect, useMemo, useState } from "react"
import { RefreshCw, X } from "lucide-react"
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
  getEventOrders,
  type EventOrderItem,
} from "@/lib/api/merchant-events.api"

const PAGE_SIZE = 20

const dateTimeFmt = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatByCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString()} ${currency}`
  }
}

function formatOptionalDate(iso?: string | null) {
  if (!iso) return "—"
  try {
    return dateTimeFmt.format(new Date(iso))
  } catch {
    return "—"
  }
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" | "success" | "warning" {
  const normalized = status.toUpperCase()
  if (normalized === "PAID" || normalized === "COMPLETED" || normalized === "SUCCESS" || normalized === "CONFIRMED") return "success"
  if (normalized === "PENDING") return "warning"
  if (normalized === "FAILED" || normalized === "CANCELLED" || normalized === "EXPIRED") return "destructive"
  return "secondary"
}

type EventOrdersDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
  eventTitle?: string
}

export function EventOrdersDrawer({ open, onOpenChange, eventId, eventTitle }: EventOrdersDrawerProps) {
  const [items, setItems] = useState<EventOrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!open) return
    setPage(1)
  }, [open, eventId])

  useEffect(() => {
    if (!open || !eventId) {
      setItems([])
      setLoadError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)

    void getEventOrders(eventId, { page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return
        setItems(data.items ?? [])
        setPage(data.page)
        setTotalPages(Math.max(1, data.totalPages))
        setTotal(data.total)
      })
      .catch((e: unknown) => {
        console.error("Failed to load event orders", e)
        if (cancelled) return
        setItems([])
        setLoadError("Could not load event orders.")
        toast.error("Could not load event orders.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, eventId, page])

  const title = useMemo(() => {
    if (eventTitle?.trim()) return `Orders for ${eventTitle}`
    return "Event orders"
  }, [eventTitle])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[100dvh] max-h-[100dvh] w-full rounded-none">
        <DrawerHeader className="border-b text-left relative pr-12">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>All orders linked to this event.</DrawerDescription>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-8 w-8"
              aria-label="Close orders drawer"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
              <RefreshCw className="h-7 w-7 animate-spin" aria-hidden />
              <span className="text-sm">Loading orders…</span>
            </div>
          ) : loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-600">No orders found for this event yet.</p>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[56px] text-center">#</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((order, idx) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-center tabular-nums">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{order.orderReference}</TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="font-medium">{order.buyerName ?? "—"}</div>
                          <div className="text-xs text-gray-500">{order.buyerEmail ?? "—"}</div>
                          <div className="text-xs text-gray-500">{order.buyerPhone ?? "—"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.tier?.name ?? "—"}</div>
                          <div className="text-xs text-gray-500">{order.tier?.tierCode ?? "—"}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{order.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatByCurrency(order.totalAmount, order.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(order.paymentStatus)}>
                            {order.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatOptionalDate(order.createdAt)}</TableCell>
                        <TableCell className="text-xs">{formatOptionalDate(order.expiresAt)}</TableCell>
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
  )
}
