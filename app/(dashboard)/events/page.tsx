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
  Banknote,
  ChevronDown,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import { useUserProfile } from "../UserProfileProvider"
import {
  getMerchantEventsStatistics,
  listMerchantEvents,
  type MerchantEventListItem,
  type MerchantEventsStatisticsResponse,
} from "@/lib/api/merchant-events.api"

const PAGE_SIZE = 20
const ALL = "__all__"

function triBool(v: string): boolean | undefined {
  if (!v || v === ALL) return undefined
  return v === "true"
}

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

function DetailedStatisticsSection({
  loading,
  s,
}: {
  loading: boolean
  s: MerchantEventsStatisticsResponse | null
}) {
  const extraKpi = [
    { label: "Total tiers", value: s?.totalTiers ?? 0, icon: Layers },
    { label: "Total orders", value: s?.totalOrders ?? 0, icon: ShoppingCart },
    { label: "Total attendees", value: s?.totalAttendees ?? 0, icon: Users },
    { label: "Checked in", value: s?.checkedInCount ?? 0, icon: UserCheck },
  ]

  return (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {extraKpi.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                  {loading ? "…" : value.toLocaleString()}
                </p>
              </div>
              <Icon className="h-8 w-8 text-gray-400 shrink-0" aria-hidden />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">Gross sales by currency</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : !s?.grossSalesByCurrency?.length ? (
            <p className="text-sm text-gray-500">No gross sales data yet.</p>
          ) : (
            <ul className="space-y-2">
              {s.grossSalesByCurrency.map((row) => (
                <li
                  key={row.currency}
                  className="flex justify-between gap-4 text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0"
                >
                  <span className="font-medium text-gray-700">{row.currency}</span>
                  <span className="tabular-nums font-semibold text-gray-900">
                    {formatByCurrency(row.grossSales, row.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Order status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {(s?.orderStatusBreakdown ?? []).map((row) => (
                  <li
                    key={row.status}
                    className="flex justify-between gap-2 border-b border-gray-50 pb-1"
                  >
                    <span className="text-gray-600">{row.status}</span>
                    <span className="font-medium tabular-nums">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Payment status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {(s?.paymentStatusBreakdown ?? []).map((row) => (
                  <li
                    key={row.status}
                    className="flex justify-between gap-2 border-b border-gray-50 pb-1"
                  >
                    <span className="text-gray-600">{row.status}</span>
                    <span className="font-medium tabular-nums">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
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
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Your events</CardTitle>
          <p className="text-sm text-gray-500 font-normal">
            {!merchantCode
              ? "…"
              : listLoading
                ? "…"
                : `${total.toLocaleString()} event${total === 1 ? "" : "s"}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search title or code…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
                disabled={!merchantCode}
                aria-label="Search events"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-xs text-gray-500">Status</span>
              <Select
                value={statusFilter || ALL}
                onValueChange={(v) => setStatusFilter(v === ALL ? "" : v)}
                disabled={!merchantCode}
              >
                <SelectTrigger className="w-full xl:w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ENDED">Ended</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-xs text-gray-500">Listing</span>
              <Select
                value={activeFilter || ALL}
                onValueChange={(v) => setActiveFilter(v === ALL ? "" : v)}
                disabled={!merchantCode}
              >
                <SelectTrigger className="w-full xl:w-[180px]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any</SelectItem>
                  <SelectItem value="true">Active listing</SelectItem>
                  <SelectItem value="false">Inactive listing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-xs text-gray-500">Visibility</span>
              <Select
                value={publicFilter || ALL}
                onValueChange={(v) => setPublicFilter(v === ALL ? "" : v)}
                disabled={!merchantCode}
              >
                <SelectTrigger className="w-full xl:w-[180px]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any</SelectItem>
                  <SelectItem value="true">Public</SelectItem>
                  <SelectItem value="false">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative rounded-md border min-h-[120px]">
            <Table>
              <TableHeader>
                <TableRow>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && !listLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-sm text-gray-500"
                    >
                      {hasListFilters
                        ? "No events match your filters."
                        : "No events yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((ev) => (
                    <TableRow key={ev.id}>
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
                        <Badge variant={statusBadgeVariant(ev.status)}>{ev.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums align-top">
                        {(ev.ticketsSold ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums align-top hidden sm:table-cell">
                        {(ev.orderCount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell align-top text-gray-700">
                        {ev.currency}
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

      <details className="group rounded-lg border border-gray-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 text-gray-500" />
            Detailed statistics
          </span>
          <span className="text-xs font-normal text-gray-500">Gross sales, breakdowns, more KPIs</span>
        </summary>
        <div className="border-t border-gray-100 px-4 pb-4">
          <DetailedStatisticsSection loading={loading} s={s} />
        </div>
      </details>
    </div>
  )
}
