"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneNumberInput } from "@/components/ui/phone-input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Calendar,
  MapPin,
  Ticket,
  Smartphone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import {
  createPublicEventOrder,
  getPublicEventByCode,
  getPublicEventStatus,
  getPublicOrder,
  getPublicOrderTickets,
  payPublicOrder,
  type CreatePublicMerchantEventOrderBody,
  type PublicMerchantEventDetailResponse,
  type PublicMerchantEventOrderCreatedResponse,
  type PublicMerchantEventOrderDetailResponse,
  type PublicMerchantEventOrderTicketsResponse,
  type PublicMerchantEventStatusResponse,
  type PublicMerchantEventTierDto,
} from "@/lib/api/public-merchant-events.api"
import { API_URL } from "@/lib/config"

const BRAND = "#08163d"

const dateFmt = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatRange(startsAt: string, endsAt?: string | null) {
  try {
    const s = new Date(startsAt)
    const e = endsAt ? new Date(endsAt) : null
    const left = dateFmt.format(s)
    if (!e || Number.isNaN(e.getTime())) return left
    return `${left} – ${dateFmt.format(e)}`
  } catch {
    return "—"
  }
}

function formatMoney(amount: number, currency: string) {
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

function resolveBannerUrl(bannerUrl: string): string {
  const url = bannerUrl.trim()
  if (!url) return ""
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const base = API_URL.replace(/\/$/, "")
  const path = url.startsWith("/") ? url : `/${url}`
  return `${base}${path}`
}

function normalizeUgPhone(input: string): string {
  let cleaned = input.replace(/\D/g, "")
  if (cleaned.startsWith("0")) {
    cleaned = "256" + cleaned.slice(1)
  }
  if (!cleaned.startsWith("256")) {
    cleaned = "256" + cleaned
  }
  return cleaned
}

function orderIsPaid(o: PublicMerchantEventOrderDetailResponse): boolean {
  const ps = (o.paymentStatus || "").toUpperCase()
  const os = (o.status || "").toUpperCase()
  return (
    ps === "SUCCESS" ||
    ps === "COMPLETED" ||
    ps === "SUCCEEDED" ||
    os === "PAID" ||
    os === "FULFILLED"
  )
}

function orderIsTerminal(o: PublicMerchantEventOrderDetailResponse): boolean {
  if (orderIsPaid(o)) return true
  const ps = (o.paymentStatus || "").toUpperCase()
  const os = (o.status || "").toUpperCase()
  if (ps === "FAILED" || ps === "CANCELLED" || ps === "REJECTED") return true
  if (os === "EXPIRED" || os === "CANCELLED" || os === "VOID") return true
  return false
}

/** When omitted, treat as paid flow (backward compatible). */
function orderRequiresPayment(o: { requiresPayment?: boolean }): boolean {
  return o.requiresPayment !== false
}

function isFreeEvent(detail: PublicMerchantEventDetailResponse | null): boolean {
  return detail?.isFree === true
}

function formatTierPrice(
  tier: PublicMerchantEventTierDto,
  currency: string,
  free: boolean
): string {
  if (free) return "Free"
  return formatMoney(tier.price, tier.currency || currency)
}

function salesAllowed(status: PublicMerchantEventStatusResponse | null): boolean {
  if (!status) return true
  if (status.canPurchase === false) return false
  if (status.isSalesOpen === false) return false
  if (status.salesOpen === false) return false
  if (status.isActive === false && status.canPurchase !== true) return false
  return true
}

function tierAvailability(t: PublicMerchantEventTierDto): number {
  if (typeof t.availableCount === "number") return Math.max(0, t.availableCount)
  const cap = t.quantity ?? 0
  const sold = t.sold ?? 0
  return Math.max(0, cap - sold)
}

/** Minimal event card when resuming from ?order= (full detail optional) */
function detailFromOrder(
  order: PublicMerchantEventOrderDetailResponse
): PublicMerchantEventDetailResponse {
  return {
    eventCode: order.event.eventCode,
    title: order.event.title,
    description: null,
    bannerUrl: null,
    location: null,
    startsAt: order.event.startsAt,
    endsAt: order.event.endsAt ?? null,
    currency: order.currency,
    checkoutUrl: null,
    tiers: [],
  }
}

type Step =
  | "loading"
  | "unavailable"
  | "form"
  | "pay"
  | "polling"
  | "tickets"
  | "resume"

interface PageProps {
  params: Promise<{ eventCode: string }>
}

function PublicEventCheckoutPage({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderFromQuery = searchParams.get("order")?.trim() || ""

  const [routeEventCode, setRouteEventCode] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<PublicMerchantEventStatusResponse | null>(null)
  const [detail, setDetail] = useState<PublicMerchantEventDetailResponse | null>(null)
  const [step, setStep] = useState<Step>("loading")

  const [tierId, setTierId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [buyerPhone, setBuyerPhone] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [buyerName, setBuyerName] = useState("")

  const [createdOrder, setCreatedOrder] =
    useState<PublicMerchantEventOrderCreatedResponse | null>(null)
  const [activeOrderRef, setActiveOrderRef] = useState<string | null>(null)
  const [network, setNetwork] = useState<"" | "MTN" | "AIRTEL">("")

  const [ticketsData, setTicketsData] =
    useState<PublicMerchantEventOrderTicketsResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedTier = useMemo(() => {
    if (!detail?.tiers?.length) return null
    return detail.tiers.find((t) => t.id === tierId) ?? detail.tiers[0] ?? null
  }, [detail, tierId])

  useEffect(() => {
    void params.then((p) => setRouteEventCode(decodeURIComponent(p.eventCode || "")))
  }, [params])

  const loadEvent = useCallback(async () => {
    if (!routeEventCode) return
    setLoadError(null)
    setStep("loading")
    try {
      const [st, ev] = await Promise.all([
        getPublicEventStatus(routeEventCode).catch(() => null as PublicMerchantEventStatusResponse | null),
        getPublicEventByCode(routeEventCode),
      ])
      setStatus(st)
      setDetail(ev)
      if (!salesAllowed(st)) {
        setStep("unavailable")
        return
      }
      const first = ev.tiers?.[0]
      if (first) setTierId(first.id)
      setStep("form")
    } catch (e) {
      console.error(e)
      setLoadError(e instanceof Error ? e.message : "Could not load this event.")
      setStep("form")
    }
  }, [routeEventCode])

  useEffect(() => {
    if (!routeEventCode) return
    if (orderFromQuery) return
    void loadEvent()
  }, [routeEventCode, orderFromQuery, loadEvent])

  /** Resume payment / tickets from ?order= */
  useEffect(() => {
    if (!routeEventCode || !orderFromQuery) return
    let cancelled = false
    ;(async () => {
      try {
        setStep("resume")
        const order = await getPublicOrder(orderFromQuery)
        if (cancelled) return
        const evCode = (order.event?.eventCode || "").toUpperCase()
        if (evCode && evCode !== routeEventCode.toUpperCase()) {
          toast.error("This order belongs to a different event.")
          setStep("form")
          return
        }
        setActiveOrderRef(order.orderReference)
        if (orderIsPaid(order)) {
          const tix = await getPublicOrderTickets(order.orderReference)
          if (!cancelled) {
            setDetail(detailFromOrder(order))
            setTicketsData(tix)
            setStep("tickets")
          }
        } else if (orderIsTerminal(order)) {
          toast.error("This order can no longer be paid.")
          router.replace(`/events/${encodeURIComponent(routeEventCode)}`)
        } else if (!orderRequiresPayment(order)) {
          const tix = await getPublicOrderTickets(order.orderReference)
          if (!cancelled) {
            setDetail(detailFromOrder(order))
            setTicketsData(tix)
            setStep("tickets")
          }
        } else {
          setDetail(detailFromOrder(order))
          setCreatedOrder({
            id: order.id,
            orderReference: order.orderReference,
            eventCode: order.event.eventCode,
            tierId: order.tier.tierId,
            quantity: order.quantity,
            unitPrice: order.unitPrice,
            totalAmount: order.totalAmount,
            currency: order.currency,
            status: order.status,
            paymentStatus: order.paymentStatus,
            expiresAt: order.expiresAt ?? null,
            requiresPayment: order.requiresPayment,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          })
          setStep("pay")
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e)
          toast.error(e instanceof Error ? e.message : "Could not load order.")
          router.replace(`/events/${encodeURIComponent(routeEventCode)}`)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [routeEventCode, orderFromQuery, router])

  useEffect(() => {
    if (!selectedTier) return
    const avail = tierAvailability(selectedTier)
    const minQ = Math.max(1, selectedTier.minPerOrder ?? 1)
    const maxQ = selectedTier.maxPerOrder
      ? Math.min(selectedTier.maxPerOrder, avail || selectedTier.maxPerOrder)
      : Math.max(minQ, avail || minQ)
    setQuantity((q) => {
      let next = q
      if (next < minQ) next = minQ
      if (maxQ >= minQ && next > maxQ) next = maxQ
      return next
    })
  }, [selectedTier])

  const onCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!routeEventCode || !selectedTier) return
    const phone = normalizeUgPhone(buyerPhone)
    if (!/^256[0-9]{9}$/.test(phone)) {
      toast.error("Enter a valid Ugandan number (e.g. 0700123456).")
      return
    }
    const avail = tierAvailability(selectedTier)
    const minQ = Math.max(1, selectedTier.minPerOrder ?? 1)
    const maxQ = selectedTier.maxPerOrder
      ? Math.min(selectedTier.maxPerOrder, avail || selectedTier.maxPerOrder)
      : avail || minQ
    if (quantity < minQ || quantity > maxQ) {
      toast.error(`Choose between ${minQ} and ${maxQ} ticket(s) for this tier.`)
      return
    }
    const body: CreatePublicMerchantEventOrderBody = {
      tierId: selectedTier.id,
      quantity,
      buyerPhone: phone,
      ...(buyerEmail.trim() ? { buyerEmail: buyerEmail.trim() } : {}),
      ...(buyerName.trim() ? { buyerName: buyerName.trim() } : {}),
    }
    setSubmitting(true)
    try {
      const created = await createPublicEventOrder(routeEventCode, body)
      setCreatedOrder(created)
      setActiveOrderRef(created.orderReference)
      if (!orderRequiresPayment(created)) {
        const tix = await getPublicOrderTickets(created.orderReference)
        setTicketsData(tix)
        setStep("tickets")
        toast.success("Registration complete. Your tickets are below.")
      } else {
        setStep("pay")
        toast.success("Order created. Complete payment on your phone.")
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Could not create order.")
    } finally {
      setSubmitting(false)
    }
  }

  /** Poll order after pay */
  useEffect(() => {
    if (step !== "polling" || !activeOrderRef) return
    let cancelled = false
    const started = Date.now()
    const maxMs = 5 * 60 * 1000

    const tick = async () => {
      try {
        const o = await getPublicOrder(activeOrderRef)
        if (cancelled) return
        if (orderIsPaid(o)) {
          const tix = await getPublicOrderTickets(activeOrderRef)
          if (!cancelled) {
            setDetail((prev) => prev ?? detailFromOrder(o))
            setTicketsData(tix)
            setStep("tickets")
            toast.success("Payment received. Your tickets are below.")
          }
          return
        }
        if (orderIsTerminal(o)) {
          if (!cancelled) {
            setStep("pay")
            toast.error("Payment was not completed. You can try again.")
          }
          return
        }
        if (Date.now() - started > maxMs) {
          if (!cancelled) {
            setStep("pay")
            toast.message("Still waiting for confirmation. You can tap Pay again or refresh.")
          }
          return
        }
      } catch (e) {
        if (!cancelled) console.error(e)
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), 2800)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [step, activeOrderRef])

  const onPay = async () => {
    if (!activeOrderRef) return
    setSubmitting(true)
    try {
      const res = await payPublicOrder(activeOrderRef, {
        ...(network ? { network } : {}),
      })
      if (res.success === false) {
        toast.error(res.message || res.error || "Payment could not start.")
        return
      }
      toast.message(res.message || "Check your phone to approve payment.")
      setStep("polling")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Payment failed.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!routeEventCode) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#08163d]" aria-hidden />
      </div>
    )
  }

  if (step === "loading" || step === "resume") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
        <Loader2
          className="h-10 w-10 animate-spin"
          style={{ color: BRAND }}
          aria-hidden
        />
        <p className="text-sm text-gray-600">Loading event…</p>
      </div>
    )
  }

  if (loadError && !detail) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16">
        <Card className="border-red-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Event not found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600">
            <p>{loadError}</p>
            <Button type="button" variant="outline" onClick={() => void loadEvent()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "unavailable" && detail) {
    const msg =
      status?.message ||
      status?.reason ||
      "Ticket sales are not open for this event right now."
    return (
      <div className="container mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl" style={{ color: BRAND }}>
              {detail.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>{msg}</p>
            <p className="text-xs text-gray-400">{formatRange(detail.startsAt, detail.endsAt)}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!detail) {
    return null
  }

  const freeEvent = isFreeEvent(detail)

  return (
    <div className="container mx-auto max-w-xl px-4 py-10 pb-16">
      <div className="mb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          RukaPay event checkout
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{detail.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{formatRange(detail.startsAt, detail.endsAt)}</p>
      </div>

      {detail.bannerUrl ? (
        <div className="relative mb-6 aspect-[21/9] w-full overflow-hidden rounded-xl border bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- merchant-provided URLs */}
          <img
            src={resolveBannerUrl(detail.bannerUrl)}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <Card className="mb-6 border-gray-200 shadow-sm">
        <CardContent className="space-y-3 pt-6 text-sm text-gray-700">
          {detail.location ? (
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
              <span>{detail.location}</span>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            <span>{formatRange(detail.startsAt, detail.endsAt)}</span>
          </div>
          {detail.description ? (
            <p className="whitespace-pre-wrap pt-2 text-gray-600">{detail.description}</p>
          ) : null}
        </CardContent>
      </Card>

      {step === "form" ? (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg" style={{ color: BRAND }}>
              {freeEvent ? "Register" : "Get tickets"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onCreateOrder}>
              <div className="space-y-2">
                <Label htmlFor="tier">Ticket type</Label>
                <Select
                  value={tierId}
                  onValueChange={setTierId}
                  disabled={!detail.tiers?.length}
                >
                  <SelectTrigger id="tier">
                    <SelectValue placeholder="Select a tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {(detail.tiers ?? []).map((t) => {
                      const cur = t.currency || detail.currency
                      const avail = tierAvailability(t)
                      return (
                        <SelectItem key={t.id} value={t.id} disabled={avail <= 0}>
                          {t.name} — {formatTierPrice(t, cur, freeEvent)}
                          {/* {avail <= 0 ? " (sold out)" : ` (${avail} left)`} */}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedTier ? (
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    min={Math.max(1, selectedTier.minPerOrder ?? 1)}
                    max={
                      selectedTier.maxPerOrder
                        ? Math.min(
                            selectedTier.maxPerOrder,
                            tierAvailability(selectedTier) || selectedTier.maxPerOrder
                          )
                        : Math.max(1, tierAvailability(selectedTier) || 1)
                    }
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                  <p className="text-xs text-gray-500">
                    {selectedTier.minPerOrder != null || selectedTier.maxPerOrder != null
                      ? `Allowed per order: ${selectedTier.minPerOrder ?? 1}–${
                          selectedTier.maxPerOrder ?? "—"
                        }.`
                      : null}
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Mobile money number</Label>
                <PhoneNumberInput
                  placeholder="0700 123 456"
                  value={buyerPhone}
                  onChange={setBuyerPhone}
                  defaultCountry="ug"
                />
                <p className="text-xs text-gray-500">
                  {freeEvent
                    ? "Uganda numbers only; used for your registration."
                    : "Uganda numbers only; used for payment prompt."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              {selectedTier ? (
                <div className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="flex justify-between font-medium text-gray-900">
                    <span>Total</span>
                    <span>
                      {freeEvent
                        ? "Free"
                        : formatMoney(
                            selectedTier.price * quantity,
                            selectedTier.currency || detail.currency
                          )}
                    </span>
                  </div>
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: BRAND }}
                disabled={submitting || !selectedTier || tierAvailability(selectedTier) <= 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {freeEvent ? "Registering…" : "Creating order…"}
                  </>
                ) : freeEvent ? (
                  "Get tickets"
                ) : (
                  "Continue to payment"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {(step === "pay" || step === "polling") &&
      createdOrder &&
      orderRequiresPayment(createdOrder) ? (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg" style={{ color: BRAND }}>
              {step === "polling" ? "Waiting for payment…" : "Pay with mobile money"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-gray-50 p-3 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Order</span>
                <span className="font-mono">{createdOrder.orderReference}</span>
              </div>
              <div className="mt-2 flex justify-between font-semibold text-gray-900">
                <span>Amount</span>
                <span>{formatMoney(createdOrder.totalAmount, createdOrder.currency)}</span>
              </div>
              {createdOrder.expiresAt ? (
                <p className="mt-2 text-xs text-amber-700">
                  Pay before {dateFmt.format(new Date(createdOrder.expiresAt))}
                </p>
              ) : null}
            </div>

            {step === "polling" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Smartphone className="h-12 w-12 animate-pulse text-blue-600" aria-hidden />
                <p className="text-center text-sm text-gray-600">
                  Approve the prompt on{" "}
                  <span className="font-medium">{normalizeUgPhone(buyerPhone) || "your phone"}</span>
                  . This page updates automatically.
                </p>
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Network (optional)</Label>
                  <Select
                    value={network || "__auto__"}
                    onValueChange={(v) =>
                      setNetwork(v === "__auto__" ? "" : (v as "MTN" | "AIRTEL"))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Auto-detect</SelectItem>
                      <SelectItem value="MTN">MTN</SelectItem>
                      <SelectItem value="AIRTEL">Airtel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  className="w-full text-white"
                  style={{ backgroundColor: BRAND }}
                  onClick={() => void onPay()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    "Pay now"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === "tickets" && ticketsData ? (
        <Card className="border-green-100 bg-green-50/40 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-green-900">
              <CheckCircle2 className="h-5 w-5" />
              Your tickets
            </CardTitle>
            <p className="text-sm font-normal text-gray-600">
              Order <span className="font-mono">{ticketsData.orderReference}</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticketsData.tickets.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-1 rounded-lg border border-green-100 bg-white p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium text-gray-900">
                    <Ticket className="h-4 w-4 text-[#08163d]" aria-hidden />
                    {t.attendeeName}
                  </span>
                  <Badge variant="secondary" className="font-mono">
                    {t.ticketCode}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  {[t.tierName, t.status].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <p className="mt-10 text-center text-xs text-gray-400">Powered by RukaPay</p>
    </div>
  )
}

export default function PublicEventCheckoutPageWithSuspense(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
          <Loader2
            className="h-10 w-10 animate-spin"
            style={{ color: BRAND }}
            aria-hidden
          />
          <p className="text-sm text-gray-600">Loading…</p>
        </div>
      }
    >
      <PublicEventCheckoutPage {...props} />
    </Suspense>
  )
}
