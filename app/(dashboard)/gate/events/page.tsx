"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Calendar, Loader2, Ticket } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getMyAssignedEvents } from "@/lib/api/merchant-events.api"
import type { MyAssignedEventItem } from "@/types/gate"

function formatEventSchedule(startsAt: string, endsAt: string | null): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short" })
    const s = fmt.format(new Date(startsAt))
    if (!endsAt) return s
    return `${s} → ${fmt.format(new Date(endsAt))}`
  } catch {
    return startsAt
  }
}

export default function GateAssignedEventsPage() {
  const router = useRouter()

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["gate", "my-assigned-events"],
    queryFn: getMyAssignedEvents,
    staleTime: 30_000,
  })

  const events: MyAssignedEventItem[] = data?.events ?? []
  const empty = !isLoading && events.length === 0

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My assigned events</h1>
          <p className="text-sm text-gray-600 mt-1">
            Select an event to check in tickets at the gate. Only events you are assigned to appear
            here.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading your events…</span>
        </div>
      ) : error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load events</CardTitle>
            <CardDescription>
              {(error as Error).message || "Please try again or contact your merchant admin."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : empty ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900">No events assigned</p>
            <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
              You do not have any events to scan for yet. Ask your business owner to grant gate access
              and assign you to events.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-gray-900 break-words">{ev.title}</h2>
                      <Badge variant="outline" className="font-mono text-xs">
                        {ev.eventCode}
                      </Badge>
                      <Badge variant="secondary">{ev.status}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{formatEventSchedule(ev.startsAt, ev.endsAt)}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full sm:w-auto shrink-0"
                    onClick={() => router.push(`/gate/scan/${ev.id}`)}
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    Check in tickets
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
