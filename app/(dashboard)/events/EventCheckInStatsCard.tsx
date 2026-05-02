"use client"

import React from "react"
import { Clock3, RefreshCw, UserCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EventCheckInStatsResponse } from "@/lib/api/merchant-events.api"

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

type EventCheckInStatsCardProps = {
  stats: EventCheckInStatsResponse | null
  loading: boolean
  error: string | null
}

export function EventCheckInStatsCard({ stats, loading, error }: EventCheckInStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Check-in stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
            <span>Loading check-in stats…</span>
          </div>
        ) : null}

        {!loading && error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && !error && !stats ? (
          <p className="text-sm text-gray-600">No check-in statistics available yet.</p>
        ) : null}

        {!loading && !error && stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500 mb-1">Total attendees</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums">
                    {stats.totalAttendees.toLocaleString()}
                  </span>
                  <Users className="h-4 w-4 text-gray-400" aria-hidden />
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500 mb-1">Checked in</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums">
                    {stats.checkedInCount.toLocaleString()}
                  </span>
                  <UserCheck className="h-4 w-4 text-gray-400" aria-hidden />
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500 mb-1">Pending</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums">{stats.pendingCount.toLocaleString()}</span>
                  <Clock3 className="h-4 w-4 text-gray-400" aria-hidden />
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500 mb-1">Check-in rate</div>
                <div className="font-semibold tabular-nums">{stats.checkInRate.toFixed(1)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
              <div className="rounded-md border p-2.5 flex items-center justify-between gap-2">
                <span className="text-gray-600">Active</span>
                <Badge variant="secondary" className="tabular-nums">
                  {(stats.statusBreakdown.ACTIVE ?? 0).toLocaleString()}
                </Badge>
              </div>
              <div className="rounded-md border p-2.5 flex items-center justify-between gap-2">
                <span className="text-gray-600">Checked in</span>
                <Badge variant="default" className="tabular-nums">
                  {(stats.statusBreakdown.CHECKED_IN ?? 0).toLocaleString()}
                </Badge>
              </div>
              <div className="rounded-md border p-2.5 flex items-center justify-between gap-2">
                <span className="text-gray-600">Cancelled</span>
                <Badge variant="destructive" className="tabular-nums bg-red-500 text-white">
                  {(stats.statusBreakdown.CANCELLED ?? 0).toLocaleString()}
                </Badge>
              </div>
              <div className="rounded-md border p-2.5 flex items-center justify-between gap-2">
                <span className="text-gray-600">Void</span>
                <Badge variant="outline" className="tabular-nums">
                  {(stats.statusBreakdown.VOID ?? 0).toLocaleString()}
                </Badge>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
