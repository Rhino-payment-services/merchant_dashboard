"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import { toast } from "sonner"
import { useUserProfile } from "../UserProfileProvider"
import {
  getMerchantEventsStatistics,
  type MerchantEventsStatisticsResponse,
} from "@/lib/api/merchant-events.api"

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

export default function EventsPage() {
  const { data: session } = useSession()
  const { isRefetching } = useUserProfile()
  const merchantCode = (session?.user as { merchantCode?: string })?.merchantCode

  const [stats, setStats] = useState<MerchantEventsStatisticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getMerchantEventsStatistics()
      setStats(data)
    } catch (e) {
      console.error("Failed to load events statistics", e)
      toast.error("Could not load events statistics. Try again.")
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!merchantCode) return
    load()
  }, [merchantCode, isRefetching, load])

  const s = stats

  const kpi = [
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
      label: "Paid orders",
      value: loading ? "…" : (s?.paidOrders ?? 0).toLocaleString(),
      icon: CircleCheck,
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
    {
      label: "Tickets sold",
      value: loading ? "…" : (s?.ticketsSoldTotal ?? 0).toLocaleString(),
      icon: Ticket,
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
          onClick={() => load()}
          disabled={loading || !merchantCode}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {kpi.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                  {value}
                </p>
              </div>
              <Icon className="h-8 w-8 text-gray-400 shrink-0" aria-hidden />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
