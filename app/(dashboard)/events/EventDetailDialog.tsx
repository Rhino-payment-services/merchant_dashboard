"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getMerchantEventById,
  type MerchantEventDetailResponse,
} from "@/lib/api/merchant-events.api"
import { API_URL } from "@/lib/config"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

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

const dateTimeFmt = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatEventRange(startsAt: string, endsAt: string) {
  try {
    const s = new Date(startsAt)
    const e = new Date(endsAt)
    return `${dateTimeFmt.format(s)} – ${dateTimeFmt.format(e)}`
  } catch {
    return "—"
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

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" | "success" | "warning" {
  const u = status.toUpperCase()
  if (u === "ACTIVE" || u === "PUBLISHED") return "success"
  if (u === "CANCELLED" || u === "ENDED") return "destructive"
  if (u === "DRAFT") return "warning"
  if (u === "PENDING") return "warning"
  return "secondary"
}

function metadataEntries(metadata: Record<string, unknown> | undefined): [string, string][] {
  if (!metadata) return []
  return Object.entries(metadata).filter(
    (e): e is [string, string] => typeof e[1] === "string" && e[1].trim() !== ""
  )
}

function normalizeBannerPath(path: string): string {
  const raw = path.trim()
  if (!raw) return ""
  const withoutLeadingPublic = raw.replace(/^\/?public\/+/i, "")
  const withLeadingSlash = withoutLeadingPublic.startsWith("/")
    ? withoutLeadingPublic
    : `/${withoutLeadingPublic}`
  return withLeadingSlash.replace(/^\/+/, "/")
}

function resolveBannerSrc(bannerUrl: string): string {
  const t = normalizeBannerPath(bannerUrl)
  if (!t) return ""
  if (t.startsWith("http://") || t.startsWith("https://")) return t
  const base = API_URL.replace(/\/$/, "")
  const path = t.startsWith("/") ? t : `/${t}`
  return `${base}${path}`
}

export type EventDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
}

export function EventDetailDialog({ open, onOpenChange, eventId }: EventDetailDialogProps) {
  const [detail, setDetail] = useState<MerchantEventDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !eventId) {
      setDetail(null)
      setLoadError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setDetail(null)

    void getMerchantEventById(eventId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((e: unknown) => {
        console.error("Failed to load event", e)
        if (!cancelled) {
          const msg = "Could not load event details."
          setLoadError(msg)
          toast.error(msg)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, eventId])

  const currency = detail?.currency ?? "UGX"
  const summary = detail?.summary
  const stats = detail?.salesStatistics
  const tiers = detail?.tiers ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4 space-y-1">
          <DialogTitle className="pr-8">Event details</DialogTitle>
          {detail ? (
            <p className="text-sm text-muted-foreground font-normal">{detail.eventCode}</p>
          ) : null}
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin" aria-hidden />
              <span className="text-sm">Loading event…</span>
            </div>
          ) : loadError ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-gray-600">{loadError}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : detail ? (
            <>
              {detail.bannerUrl ? (
                <div className="rounded-lg overflow-hidden border bg-gray-50 aspect-[21/9] max-h-48">
                  <img
                    src={resolveBannerSrc(detail.bannerUrl)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap items-start gap-2 gap-y-2">
                <h2 className="text-xl font-semibold text-gray-900 flex-1 min-w-0">
                  {detail.title}
                </h2>
                <Badge variant={statusBadgeVariant(detail.status)}>{detail.status}</Badge>
                {detail.isPublic !== undefined ? (
                  <Badge variant="outline">{detail.isPublic ? "Public" : "Private"}</Badge>
                ) : null}
                {detail.isActive !== undefined ? (
                  <Badge variant="outline">{detail.isActive ? "Listing active" : "Listing inactive"}</Badge>
                ) : null}
              </div>

              {detail.description ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {detail.description}
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium text-gray-500">Location</div>
                  <div className="text-gray-900 mt-1">{detail.location ?? "—"}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium text-gray-500">Currency</div>
                  <div className="text-gray-900 mt-1">{detail.currency}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium text-gray-500">Capacity</div>
                  <div className="text-gray-900 mt-1 tabular-nums">
                    {(detail.capacity ?? summary?.capacity) != null
                      ? (detail.capacity ?? summary?.capacity)!.toLocaleString()
                      : "—"}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium text-gray-500">Event ID</div>
                  <div className="text-gray-900 mt-1 font-mono text-xs break-all">{detail.id}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Event schedule</h3>
                  <p className="text-sm text-gray-800">{formatEventRange(detail.startsAt, detail.endsAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Sales window</h3>
                  <p className="text-sm text-gray-800">
                    {detail.salesStartAt && detail.salesEndAt
                      ? `${formatOptionalDate(detail.salesStartAt)} – ${formatOptionalDate(detail.salesEndAt)}`
                      : "—"}
                  </p>
                </div>
              </div>

              {metadataEntries(detail.metadata).length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Details</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {metadataEntries(detail.metadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                        <dt className="text-gray-600 capitalize">{k}</dt>
                        <dd className="font-medium text-gray-900 text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Ticket tiers</h3>
                {tiers.length === 0 ? (
                  <p className="text-sm text-gray-500">No tiers configured.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right tabular-nums">Qty</TableHead>
                          <TableHead className="text-right tabular-nums">Sold</TableHead>
                          <TableHead className="hidden sm:table-cell">Limits</TableHead>
                          <TableHead className="hidden md:table-cell">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tiers.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-mono text-xs">{t.tierCode ?? "—"}</TableCell>
                            <TableCell className="max-w-[200px]">
                              <div className="font-medium">{t.name}</div>
                              {t.description ? (
                                <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{t.description}</div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatByCurrency(t.price, t.currency ?? currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{t.quantity}</TableCell>
                            <TableCell className="text-right tabular-nums">{t.soldCount ?? 0}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-gray-600">
                              {t.minPerOrder != null || t.maxPerOrder != null
                                ? `${t.minPerOrder ?? "—"} – ${t.maxPerOrder ?? "—"} per order`
                                : "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {t.status ? (
                                <Badge variant={statusBadgeVariant(t.status)} className="text-xs">
                                  {t.status}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {summary ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <li>
                        <span className="text-gray-500 block text-xs">Gross sales</span>
                        <span className="font-semibold tabular-nums">
                          {formatByCurrency(summary.grossSales ?? 0, currency)}
                        </span>
                      </li>
                      <li>
                        <span className="text-gray-500 block text-xs">Tickets sold</span>
                        <span className="font-semibold tabular-nums">
                          {(summary.ticketsSold ?? 0).toLocaleString()}
                        </span>
                      </li>
                      <li>
                        <span className="text-gray-500 block text-xs">Remaining capacity</span>
                        <span className="font-semibold tabular-nums">
                          {(summary.remainingCapacity ?? "—").toString()}
                        </span>
                      </li>
                      <li>
                        <span className="text-gray-500 block text-xs">Orders</span>
                        <span className="font-semibold tabular-nums">
                          {(summary.orderCount ?? 0).toLocaleString()}
                        </span>
                      </li>
                      <li>
                        <span className="text-gray-500 block text-xs">Paid orders</span>
                        <span className="font-semibold tabular-nums">
                          {(summary.paidOrderCount ?? 0).toLocaleString()}
                        </span>
                      </li>
                      <li>
                        <span className="text-gray-500 block text-xs">Attendees</span>
                        <span className="font-semibold tabular-nums">
                          {(summary.attendeeCount ?? 0).toLocaleString()}
                        </span>
                      </li>
                      <li>
                        <span className="text-gray-500 block text-xs">Checked in</span>
                        <span className="font-semibold tabular-nums">
                          {(summary.checkedInCount ?? 0).toLocaleString()}
                        </span>
                      </li>
                      <li>
                        <span className="text-gray-500 block text-xs">Tiers</span>
                        <span className="font-semibold tabular-nums">
                          {(summary.tierCount ?? tiers.length).toLocaleString()}
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              ) : null}

              {stats ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Sales statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Order status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5 text-sm">
                          {(stats.orderStatusBreakdown ?? []).map((row) => (
                            <li key={row.status} className="flex justify-between gap-2">
                              <span className="text-gray-600">{row.status}</span>
                              <span className="font-medium tabular-nums">{row.count}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Payment status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5 text-sm">
                          {(stats.paymentStatusBreakdown ?? []).map((row) => (
                            <li key={row.status} className="flex justify-between gap-2">
                              <span className="text-gray-600">{row.status}</span>
                              <span className="font-medium tabular-nums">{row.count}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {stats.tierSales && stats.tierSales.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Sales by tier</h4>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead className="text-right tabular-nums">Available</TableHead>
                              <TableHead className="text-right tabular-nums">Sold</TableHead>
                              <TableHead className="text-right">Gross</TableHead>
                              <TableHead className="text-right tabular-nums hidden sm:table-cell">
                                Paid orders
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.tierSales.map((row) => (
                              <TableRow key={row.tierId}>
                                <TableCell className="font-mono text-xs">{row.tierCode ?? "—"}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {(row.availableCount ?? 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {(row.soldCount ?? 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatByCurrency(row.grossSales ?? 0, currency)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums hidden sm:table-cell">
                                  {(row.paidOrderCount ?? 0).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {(detail.createdAt || detail.updatedAt) && (
                <p className="text-xs text-gray-400 border-t pt-4">
                  {detail.createdAt ? `Created ${formatOptionalDate(detail.createdAt)}` : null}
                  {detail.createdAt && detail.updatedAt ? " · " : null}
                  {detail.updatedAt ? `Updated ${formatOptionalDate(detail.updatedAt)}` : null}
                </p>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
