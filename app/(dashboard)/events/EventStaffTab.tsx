"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  assignEventStaff,
  getEventStaff,
  removeEventStaff,
} from "@/lib/api/merchant-events.api"
import type { EventStaffMember } from "@/types/gate"
import { useWalletTeam, useMyBusinessWallet, teamQueryKeys } from "@/lib/hooks/useTeam"
import type { TeamMember } from "@/lib/api/team.api"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

const dateFmt = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return dateFmt.format(new Date(iso))
  } catch {
    return "—"
  }
}

type EventStaffTabProps = {
  eventId: string | null
  open: boolean
}

export function EventStaffTab({ eventId, open }: EventStaffTabProps) {
  const queryClient = useQueryClient()
  const { data: wallet } = useMyBusinessWallet()
  const walletId = wallet?.id ?? ""

  const { data: teamData } = useWalletTeam(walletId)
  const teamMembers = teamData?.members ?? []

  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>("")
  const [assigning, setAssigning] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<EventStaffMember | null>(null)

  const {
    data: staffData,
    isLoading: staffLoading,
    refetch: refetchStaff,
    isFetching: staffFetching,
  } = useQuery({
    queryKey: ["merchant-events", eventId, "staff"],
    queryFn: () => getEventStaff(eventId!),
    enabled: Boolean(open && eventId),
  })

  const staff = staffData?.staff ?? []

  useEffect(() => {
    if (!open) {
      setSelectedTeamMemberId("")
      setConfirmRemove(null)
    }
  }, [open])

  const assignableMembers: TeamMember[] = useMemo(() => {
    const assignedIds = new Set(staff.map((s) => s.id))
    return teamMembers.filter(
      (m) =>
        m.status === "ACTIVE" &&
        m.role !== "OWNER" &&
        m.canCheckInEventTickets === true &&
        !assignedIds.has(m.id)
    )
  }, [teamMembers, staff])

  async function handleAssign() {
    if (!eventId || !selectedTeamMemberId) {
      toast.error("Select a team member to assign.")
      return
    }
    setAssigning(true)
    try {
      await assignEventStaff(eventId, selectedTeamMemberId)
      toast.success("Staff assigned to this event.")
      setSelectedTeamMemberId("")
      await refetchStaff()
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not assign staff."
      toast.error(typeof msg === "string" ? msg : "Could not assign staff.")
    } finally {
      setAssigning(false)
    }
  }

  async function handleRemove(member: EventStaffMember) {
    if (!eventId) return
    setRemovingId(member.id)
    try {
      await removeEventStaff(eventId, member.id)
      toast.success("Assignment removed.")
      setConfirmRemove(null)
      await refetchStaff()
      if (walletId) {
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(walletId) })
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not remove assignment."
      toast.error(typeof msg === "string" ? msg : "Could not remove assignment.")
    } finally {
      setRemovingId(null)
    }
  }

  if (!eventId) {
    return <p className="text-sm text-gray-500 py-6">No event selected.</p>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Assign gate staff</h3>
        <p className="text-xs text-gray-600">
          Only wallet team members with <strong>Check in event tickets</strong> can be assigned.
          Use <strong>Team Members</strong> to invite or update permissions.
        </p>
        {!walletId ? (
          <p className="text-sm text-amber-700">Loading wallet…</p>
        ) : assignableMembers.length === 0 ? (
          <p className="text-sm text-gray-500">
            No eligible team members to assign. Add someone with gate check-in permission on the Team
            page.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-gray-500">Team member</label>
              <Select value={selectedTeamMemberId} onValueChange={setSelectedTeamMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose member…" />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} — {m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => void handleAssign()}
              disabled={assigning || !selectedTeamMemberId}
            >
              {assigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">Staff on this event</h3>
          {staffFetching ? (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Updating…
            </span>
          ) : null}
        </div>

        {staffLoading ? (
          <div className="flex justify-center py-12 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No staff assigned yet.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right tabular-nums">Check-ins</TableHead>
                  <TableHead className="hidden sm:table-cell">Last check-in</TableHead>
                  <TableHead className="hidden md:table-cell">Assigned</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.firstName} {row.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[180px] truncate">
                      {row.email}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.ticketsCheckedIn.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {formatDt(row.lastCheckInAt)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {formatDt(row.assignedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={removingId === row.id}
                        onClick={() => setConfirmRemove(row)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(confirmRemove)} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff from event?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove
                ? `${confirmRemove.firstName} ${confirmRemove.lastName} will no longer be assigned to this event. Their wallet permissions are unchanged.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                if (confirmRemove) void handleRemove(confirmRemove)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
