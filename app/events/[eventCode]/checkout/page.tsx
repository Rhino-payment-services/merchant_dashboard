import { redirect } from "next/navigation"

/**
 * QR / backend checkout URLs use …/events/:eventCode/checkout.
 * The checkout UI lives at /events/:eventCode — redirect so both work.
 */
export default async function EventCheckoutRedirectPage({
  params,
}: {
  params: Promise<{ eventCode: string }>
}) {
  const { eventCode } = await params
  redirect(`/events/${encodeURIComponent(eventCode)}`)
}
