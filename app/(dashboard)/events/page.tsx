"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RefreshCw,
  Calendar,
  Activity,
  Layers,
  ShoppingCart,
  CircleCheck,
  Users,
  UserCheck,
  Ticket,
  Search,
  Plus,
  Eye,
  Pencil,
  QrCode,
} from "lucide-react"
import { toast } from "sonner"
import { useUserProfile } from "../UserProfileProvider"
import {
  getMerchantEventsStatistics,
  listMerchantEvents,
  updateMerchantEventStatus,
  type MerchantEventListItem,
  type MerchantEventsStatisticsResponse,
} from "@/lib/api/merchant-events.api"
import { CreateEventDialog } from "./CreateEventDialog"
import { EditEventDialog } from "./EditEventDialog"
import { EventDetailDialog } from "./EventDetailDialog"
import { EventCheckoutQrDialog } from "./EventCheckoutQrDialog"
import { ActivateEventModal } from "./ActivateEventModal"
import { EventOrdersDrawer } from "./EventOrdersDrawer"

const PAGE_SIZE = 20
const ALL = "__all__"

function triBool(v: string): boolean | undefined {
  if (!v || v === ALL) return undefined
  return v === "true"
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

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  const u = status.toUpperCase()
  if (u === "ACTIVE" || u === "PUBLISHED") return "default"
  if (u === "CANCELLED" || u === "ENDED") return "destructive"
  return "secondary"
}

export default function EventsPage() {
  const { data: session } = useSession()
  const { isRefetching } = useUserProfile()
  const merchantCode = (session?.user as { merchantCode?: string })?.merchantCode

  const [stats, setStats] = useState<MerchantEventsStatisticsResponse | null>(null)
  const [items, setItems] = useState<MerchantEventListItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)

  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [publicFilter, setPublicFilter] = useState("")
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [checkoutQrEventId, setCheckoutQrEventId] = useState<string | null>(null)
  const [checkoutQrEventTitle, setCheckoutQrEventTitle] = useState("")
  const [ordersDrawerOpen, setOrdersDrawerOpen] = useState(false)
  const [ordersEventId, setOrdersEventId] = useState<string | null>(null)
  const [ordersEventTitle, setOrdersEventTitle] = useState("")
  const [activatingEventId, setActivatingEventId] = useState<string | null>(null)
  const [activatingEventTitle, setActivatingEventTitle] = useState("")
  const [statusUpdating, setStatusUpdating] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 400)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const listParams = useCallback(
    (nextPage: number) => ({
      page: nextPage,
      limit: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(triBool(activeFilter) !== undefined ? { isActive: triBool(activeFilter)! } : {}),
      ...(triBool(publicFilter) !== undefined ? { isPublic: triBool(publicFilter)! } : {}),
    }),
    [debouncedSearch, statusFilter, activeFilter, publicFilter]
  )

  const fetchList = useCallback(
    async (nextPage: number) => {
      if (!merchantCode) return
      try {
        setListLoading(true)
        const listData = await listMerchantEvents(listParams(nextPage))
        setItems(listData.items)
        setPage(listData.page)
        setTotalPages(Math.max(1, listData.totalPages))
        setTotal(listData.total)
      } catch (e) {
        console.error("Failed to load events list", e)
        toast.error("Could not load events list. Try again.")
        setItems([])
      } finally {
        setListLoading(false)
      }
    },
    [merchantCode, listParams]
  )

  useEffect(() => {
    if (!merchantCode) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const statsData = await getMerchantEventsStatistics()
        if (!cancelled) setStats(statsData)
      } catch (e) {
        console.error("Failed to load events statistics", e)
        if (!cancelled) {
          toast.error("Could not load events statistics. Try again.")
          setStats(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [merchantCode, isRefetching])

  useEffect(() => {
    if (!merchantCode) return
    fetchList(1)
  }, [merchantCode, debouncedSearch, statusFilter, activeFilter, publicFilter, isRefetching, fetchList])

  const refreshAll = useCallback(async () => {
    if (!merchantCode) return
    try {
      setLoading(true)
      setListLoading(true)
      const [statsData, listData] = await Promise.all([
        getMerchantEventsStatistics(),
        listMerchantEvents(listParams(page)),
      ])
      setStats(statsData)
      setItems(listData.items)
      setPage(listData.page)
      setTotalPages(Math.max(1, listData.totalPages))
      setTotal(listData.total)
    } catch (e) {
      console.error("Failed to refresh events data", e)
      toast.error("Could not refresh events. Try again.")
      setStats(null)
      setItems([])
    } finally {
      setLoading(false)
      setListLoading(false)
    }
  }, [merchantCode, listParams, page])

  const handleActivateEvent = useCallback(async () => {
    if (!activatingEventId) return
    try {
      setStatusUpdating(true)
      await updateMerchantEventStatus(activatingEventId, { status: "ACTIVE" })
      toast.success("Event activated successfully.")
      setActivatingEventId(null)
      setActivatingEventTitle("")
      await refreshAll()
    } catch (e) {
      console.error("Failed to activate event", e)
      toast.error("Failed to activate event. Please try again.")
    } finally {
      setStatusUpdating(false)
    }
  }, [activatingEventId, refreshAll])

  const s = stats

  const hasListFilters =
    Boolean(debouncedSearch) ||
    Boolean(statusFilter) ||
    Boolean(activeFilter) ||
    Boolean(publicFilter)

  const headline = [
    {
      label: "Total events",
      value: loading ? "…" : (s?.totalEvents ?? 0).toLocaleString(),
      icon: Calendar,
    },
    {
      label: "Active events",
      value: loading ? "…" : (s?.activeEvents ?? 0).toLocaleString(),
      icon: Activity,
    },
    {
      label: "Tickets sold",
      value: loading ? "…" : (s?.ticketsSoldTotal ?? 0).toLocaleString(),
      icon: Ticket,
    },
    {
      label: "Paid orders",
      value: loading ? "…" : (s?.paidOrders ?? 0).toLocaleString(),
      icon: CircleCheck,
    },
    {
      label: "Total tiers",
      value: loading ? "…" : (s?.totalTiers ?? 0).toLocaleString(),
      icon: Layers,
    },
    {
      label: "Total orders",
      value: loading ? "…" : (s?.totalOrders ?? 0).toLocaleString(),
      icon: ShoppingCart,
    },
    {
      label: "Total attendees",
      value: loading ? "…" : (s?.totalAttendees ?? 0).toLocaleString(),
      icon: Users,
    },
    {
      label: "Checked in",
      value: loading ? "…" : (s?.checkedInCount ?? 0).toLocaleString(),
      icon: UserCheck,
    },
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-2">
            Overview of your event listings, ticket sales, and attendance.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => refreshAll()}
          disabled={!merchantCode || (loading && listLoading)}
        >
          <RefreshCw
            className={`h-4 w-4 ${loading || listLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {headline.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-medium text-gray-500">{label}</h3>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                  {value}
                </p>
              </div>
              <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 shrink-0" aria-hidden />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
            <span className="text-base font-medium text-gray-900">All Events ({total.toLocaleString()})</span>
            <div className="flex w-full flex-col items-stretch justify-end gap-3 xl:flex-1 xl:flex-row xl:flex-wrap xl:items-end">
              <div className="w-full xl:min-w-[320px] xl:max-w-[560px] xl:flex-1">
                <div className="relative w-full">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    placeholder="Search title or code…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-10 pl-8 text-sm"
                    disabled={!merchantCode}
                    aria-label="Search events"
                  />
                </div>
              </div>
              <div className="min-w-[180px]">
                <Select
                  value={statusFilter || ALL}
                  onValueChange={(v) => setStatusFilter(v === ALL ? "" : v)}
                  disabled={!merchantCode}
                >
                  <SelectTrigger className="h-10 w-full xl:w-[200px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="shrink-0 xl:ml-auto">
              <Button
                type="button"
                className="h-10 w-full gap-2 xl:w-auto"
                onClick={() => setCreateEventOpen(true)}
                disabled={!merchantCode}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Create event
              </Button>
            </div>
          </div>

          <CreateEventDialog
            open={createEventOpen}
            onOpenChange={setCreateEventOpen}
            onCreated={() => {
              void refreshAll()
            }}
            disabled={!merchantCode}
          />

          <EditEventDialog
            open={editEventId != null}
            onOpenChange={(o) => {
              if (!o) setEditEventId(null)
            }}
            eventId={editEventId}
            onUpdated={() => {
              void refreshAll()
            }}
            disabled={!merchantCode}
          />

          <EventDetailDialog
            open={selectedEventId != null}
            onOpenChange={(o) => {
              if (!o) setSelectedEventId(null)
            }}
            eventId={selectedEventId}
          />

          <EventCheckoutQrDialog
            open={checkoutQrEventId != null}
            onOpenChange={(o) => {
              if (!o) {
                setCheckoutQrEventId(null)
                setCheckoutQrEventTitle("")
              }
            }}
            eventId={checkoutQrEventId}
            eventTitle={checkoutQrEventTitle}
          />

          <ActivateEventModal
            open={activatingEventId != null}
            eventTitle={activatingEventTitle}
            loading={statusUpdating}
            onOpenChange={(open) => {
              if (!open) {
                setActivatingEventId(null)
                setActivatingEventTitle("")
              }
            }}
            onConfirm={() => {
              void handleActivateEvent()
            }}
          />

          <EventOrdersDrawer
            open={ordersDrawerOpen}
            onOpenChange={(o) => {
              setOrdersDrawerOpen(o)
              if (!o) {
                setOrdersEventId(null)
                setOrdersEventTitle("")
              }
            }}
            eventId={ordersEventId}
            eventTitle={ordersEventTitle}
          />

          <div className="relative rounded-md border min-h-[120px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[52px] text-center">#</TableHead>
                  <TableHead className="min-w-[180px]">Event</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[220px]">
                    Schedule
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right tabular-nums">Tickets</TableHead>
                  <TableHead className="text-right tabular-nums hidden sm:table-cell">
                    Orders
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Currency</TableHead>
                  <TableHead className="text-center w-[56px]">QR code</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && !listLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-24 text-center text-sm text-gray-500"
                    >
                      {hasListFilters
                        ? "No events match your filters."
                        : "No events yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((ev, idx) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-center align-top tabular-nums text-gray-500">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        <div className="font-medium text-gray-900">{ev.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{ev.eventCode}</div>
                        <div className="text-xs text-gray-500 mt-1 lg:hidden">
                          {formatEventRange(ev.startsAt, ev.endsAt)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell align-top whitespace-normal text-gray-600 text-sm max-w-[280px]">
                        {formatEventRange(ev.startsAt, ev.endsAt)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell align-top whitespace-normal text-gray-600 text-sm max-w-[200px]">
                        {ev.location ?? "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        {ev.status.toUpperCase() === "DRAFT" ? (
                          <button
                            type="button"
                            className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                            onClick={() => {
                              setActivatingEventId(ev.id)
                              setActivatingEventTitle(ev.title)
                            }}
                            disabled={!merchantCode || statusUpdating}
                            aria-label={`Activate ${ev.title}`}
                          >
                            <Badge
                              variant={statusBadgeVariant(ev.status)}
                              className="cursor-pointer transition-opacity hover:opacity-80"
                            >
                              {ev.status}
                            </Badge>
                          </button>
                        ) : (
                          <Badge variant={statusBadgeVariant(ev.status)}>{ev.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums align-top">
                        {(ev.ticketsSold ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums align-top hidden sm:table-cell">
                        <button
                          type="button"
                          className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:no-underline"
                          onClick={() => {
                            setOrdersEventId(ev.id)
                            setOrdersEventTitle(ev.title)
                            setOrdersDrawerOpen(true)
                          }}
                          disabled={!merchantCode || (ev.orderCount ?? 0) === 0}
                          aria-label={`View orders for ${ev.title}`}
                        >
                          {(ev.orderCount ?? 0).toLocaleString()}
                        </button>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell align-top text-gray-700">
                        {ev.currency}
                      </TableCell>
                      <TableCell className="text-center align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 mx-auto"
                          onClick={() => {
                            setCheckoutQrEventId(ev.id)
                            setCheckoutQrEventTitle(ev.title)
                          }}
                          disabled={!merchantCode}
                          aria-label={`Show checkout QR for ${ev.title}`}
                        >
                          <QrCode className="h-4 w-4" aria-hidden />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setEditEventId(ev.id)}
                            disabled={!merchantCode}
                            aria-label={`Edit ${ev.title}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setSelectedEventId(ev.id)}
                            disabled={!merchantCode}
                            aria-label={`View details for ${ev.title}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {listLoading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-500" aria-hidden />
                <span className="sr-only">Loading list…</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
            <span>
              Page {page} of {totalPages}
              {total > 0 ? (
                <span className="text-gray-400">
                  {" "}
                  ({total.toLocaleString()} total)
                </span>
              ) : null}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchList(1)}
                disabled={page <= 1 || listLoading || !merchantCode}
              >
                First
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchList(Math.max(1, page - 1))}
                disabled={page <= 1 || listLoading || !merchantCode}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchList(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || listLoading || !merchantCode}
              >
                Next
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchList(totalPages)}
                disabled={page >= totalPages || listLoading || !merchantCode}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
