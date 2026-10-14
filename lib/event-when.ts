const dateTimeFmt = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatEventWhen(
  startsAt?: string | null,
  endsAt?: string | null,
  scheduleNote?: string | null,
): string {
  const note = scheduleNote?.trim() || ""
  if (!startsAt) {
    return note || "Open until inactive"
  }
  try {
    const s = new Date(startsAt)
    if (Number.isNaN(s.getTime())) {
      return note || "Open until inactive"
    }
    const e = endsAt ? new Date(endsAt) : null
    const range =
      e && !Number.isNaN(e.getTime())
        ? `${dateTimeFmt.format(s)} – ${dateTimeFmt.format(e)}`
        : dateTimeFmt.format(s)
    return note ? `${range} · ${note}` : range
  } catch {
    return note || "—"
  }
}
