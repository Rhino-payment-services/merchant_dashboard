"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CircleHelp, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  getMerchantEventById,
  updateMerchantEventWithTiers,
  uploadEventBanner,
  uploadEventLogo,
  type CreateMerchantEventTierPayload,
  type MerchantEventDetailResponse,
  type MerchantEventTierFull,
  type UpdateMerchantEventWithTiersPayload,
} from "@/lib/api/merchant-events.api"
import { BannerUploadCard } from "./BannerUploadCard"

const CODE_PATTERN = /^[A-Z0-9-]*$/

const EVENT_CATEGORY_OPTIONS = [
  { value: "_none", label: "Select a category (optional)" },
  { value: "conference", label: "Conference" },
  { value: "concert", label: "Concert" },
  { value: "sports", label: "Sports" },
  { value: "festival", label: "Festival" },
  { value: "workshop", label: "Workshop" },
  { value: "networking", label: "Networking" },
  { value: "seminar_webinar", label: "Seminar / webinar" },
  { value: "charity", label: "Charity / fundraiser" },
  { value: "private_event", label: "Private event" },
  { value: "other", label: "Other" },
] as const

const PRESET_CATEGORY_VALUES = new Set(
  EVENT_CATEGORY_OPTIONS.filter((o) => o.value !== "_none").map((o) => o.value)
)

type EventCategoryValue = Exclude<typeof EVENT_CATEGORY_OPTIONS[number]['value'], '_none'>

function isValidCategoryValue(value: string): value is EventCategoryValue {
  return PRESET_CATEGORY_VALUES.has(value as EventCategoryValue)
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso || !String(iso).trim()) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hour = String(d.getHours()).padStart(2, "0")
    const minute = String(d.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hour}:${minute}`
  } catch {
    return ""
  }
}

function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9-]/g, "")
}

function datetimeLocalToIso(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
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

type TierRow = {
  key: string
  /** From API when editing an existing tier; omitted for tiers added in the dialog */
  serverTierId?: string
  tierCode: string
  name: string
  description: string
  price: string
  currency: string
  quantity: string
  minPerOrder: string
  maxPerOrder: string
  salesStartAt: string
  salesEndAt: string
}

function newTierRow(): TierRow {
  return {
    key: crypto.randomUUID(),
    serverTierId: undefined,
    tierCode: "",
    name: "",
    description: "",
    price: "",
    currency: "",
    quantity: "1",
    minPerOrder: "1",
    maxPerOrder: "",
    salesStartAt: "",
    salesEndAt: "",
  }
}

type FormFields = {
  title: string
  description: string
  bannerUrl: string
  logoUrl: string
  location: string
  startsAt: string
  scheduleNote: string
  endsAt: string
  salesStartAt: string
  salesEndAt: string
  currency: string
  isPublic: string
  isFree: string
  capacity: string
  categoryPreset: string
  categoryCustom: string
  audience: string
}

const emptyForm = (): FormFields => ({
  title: "",
  description: "",
  bannerUrl: "",
  logoUrl: "",
  location: "",
  startsAt: "",
  scheduleNote: "",
  endsAt: "",
  salesStartAt: "",
  salesEndAt: "",
  currency: "UGX",
  isPublic: "true",
  isFree: "false",
  capacity: "",
  categoryPreset: "_none",
  categoryCustom: "",
  audience: "",
})

function mapDetailToForm(detail: MerchantEventDetailResponse): FormFields {
  const meta = detail.metadata ?? {}
  const catRaw = typeof meta.category === "string" ? meta.category.trim() : ""
  const audience = typeof meta.audience === "string" ? meta.audience : ""

  let categoryPreset = "_none"
  let categoryCustom = ""
  if (catRaw) {
    if (isValidCategoryValue(catRaw) && catRaw !== "other") {
      categoryPreset = catRaw
    } else if (catRaw === "other") {
      categoryPreset = "other"
      categoryCustom = ""
    } else {
      categoryPreset = "other"
      categoryCustom = catRaw
    }
  }

  return {
    title: detail.title ?? "",
    description: detail.description ?? "",
    bannerUrl: detail.bannerUrl ?? "",
    logoUrl: detail.logoUrl ?? "",
    location: detail.location ?? "",
    startsAt: isoToDatetimeLocal(detail.startsAt),
    scheduleNote: detail.scheduleNote ?? "",
    endsAt: isoToDatetimeLocal(detail.endsAt),
    salesStartAt: isoToDatetimeLocal(detail.salesStartAt),
    salesEndAt: isoToDatetimeLocal(detail.salesEndAt),
    currency: detail.currency?.trim() || "UGX",
    isPublic: detail.isPublic === false ? "false" : "true",
    isFree: detail.isFree === true ? "true" : "false",
    capacity: detail.capacity != null ? String(detail.capacity) : "",
    categoryPreset,
    categoryCustom,
    audience,
  }
}

function tierRowsFromDetail(tiers: MerchantEventTierFull[] | undefined): TierRow[] {
  if (!tiers?.length) return [newTierRow()]
  return tiers.map((t) => ({
    key: crypto.randomUUID(),
    serverTierId: t.id?.trim() || undefined,
    tierCode: t.tierCode ?? "",
    name: t.name ?? "",
    description: t.description != null ? String(t.description) : "",
    price: t.price != null ? String(t.price) : "",
    currency: t.currency ?? "",
    quantity: t.quantity != null ? String(t.quantity) : "1",
    minPerOrder: t.minPerOrder != null ? String(t.minPerOrder) : "1",
    maxPerOrder: t.maxPerOrder != null ? String(t.maxPerOrder) : "",
    salesStartAt: isoToDatetimeLocal(t.salesStartAt ?? undefined),
    salesEndAt: isoToDatetimeLocal(t.salesEndAt ?? undefined),
  }))
}

function Req() {
  return (
    <span className="text-red-600" aria-hidden>
      *
    </span>
  )
}

function Opt() {
  return <span className="text-muted-foreground font-normal">(optional)</span>
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="More information"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

function getApiErrorMessage(e: unknown): string {
  if (typeof e === "object" && e !== null && "response" in e) {
    const data = (e as { response?: { data?: { message?: string | string[] } } }).response?.data
    const m = data?.message
    if (typeof m === "string") return m
    if (Array.isArray(m) && m.length) return m.join(", ")
  }
  if (e instanceof Error) return e.message
  return "Could not update event. Try again."
}

const STEPS = [
  { id: 1, title: "Event details", description: "Title, venue, and media" },
  { id: 2, title: "Schedule", description: "Event and sales windows" },
  { id: 3, title: "Sales settings", description: "Currency, visibility, capacity" },
  { id: 4, title: "Ticket tiers", description: "At least one pricing tier" },
] as const

export type EditEventDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
  onUpdated: () => void
  disabled?: boolean
}

export function EditEventDialog({
  open,
  onOpenChange,
  eventId,
  onUpdated,
  disabled,
}: EditEventDialogProps) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormFields>(emptyForm)
  const [tiers, setTiers] = useState<TierRow[]>(() => [newTierRow()])
  const [submitting, setSubmitting] = useState(false)
  const [stepError, setStepError] = useState("")
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep(1)
    setForm(emptyForm())
    setTiers([newTierRow()])
    setStepError("")
    setSubmitting(false)
    setBannerFile(null)
    setUploadingBanner(false)
    setLogoFile(null)
    setUploadingLogo(false)
    setLoadError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      reset()
      setLoadingDetail(false)
      return
    }
    if (!eventId) return

    let cancelled = false
    setLoadingDetail(true)
    setLoadError(null)
    setStepError("")
    setStep(1)
    setBannerFile(null)
    setLogoFile(null)

    void getMerchantEventById(eventId)
      .then((data) => {
        if (cancelled) return
        setForm(mapDetailToForm(data))
        setTiers(tierRowsFromDetail(data.tiers))
      })
      .catch((e: unknown) => {
        console.error(e)
        if (!cancelled) {
          const msg = "Could not load event for editing."
          setLoadError(msg)
          toast.error(msg)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, eventId, reset])

  const updateField = <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const setEventPricingType = (isFreeValue: string) => {
    updateField("isFree", isFreeValue)
    if (isFreeValue === "true") {
      setTiers((rows) => rows.map((r) => ({ ...r, price: "0" })))
    }
  }

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!form.title.trim()) return "Enter an event title."
      return null
    }
    if (s === 2) {
      const note = form.scheduleNote.trim()
      if (note.length > 120) return "When it happens must be 120 characters or fewer."
      if (!form.startsAt.trim() && !note) {
        return "Choose an event start date, or write when it happens (e.g. Every Friday)."
      }
      const startIso = form.startsAt.trim() ? datetimeLocalToIso(form.startsAt) : null
      if (form.startsAt.trim() && !startIso) return "Invalid event start date."
      if (form.endsAt.trim()) {
        const endIso = datetimeLocalToIso(form.endsAt)
        if (!endIso) return "Invalid event end date."
        if (startIso && new Date(endIso) < new Date(startIso)) return "End must be after start."
      }
      if (form.salesStartAt.trim() && form.salesEndAt.trim()) {
        const ss = datetimeLocalToIso(form.salesStartAt)
        const se = datetimeLocalToIso(form.salesEndAt)
        if (ss && se && new Date(se) < new Date(ss)) return "Sales end must be after sales start."
      }
      return null
    }
    if (s === 3) {
      if (form.currency.trim().length > 10) return "Currency code is too long."
      if (form.capacity.trim()) {
        const cap = Number.parseInt(form.capacity, 10)
        if (Number.isNaN(cap) || cap < 1) return "Capacity must be a positive whole number."
      }
      return null
    }
    if (s === 4) {
      if (tiers.length < 1) return "Add at least one ticket tier."
      for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i]
        if (!t.name.trim()) return `Tier ${i + 1}: enter a name.`
        if (t.tierCode.trim()) {
          const tc = normalizeCode(t.tierCode.trim())
          if (!CODE_PATTERN.test(tc) || tc.length > 64) {
            return `Tier ${i + 1}: code must be uppercase letters, numbers, hyphens (max 64).`
          }
        }
        const price = Number.parseFloat(t.price)
        if (Number.isNaN(price) || price < 0) return `Tier ${i + 1}: enter a valid price (≥ 0).`
        const eventIsFree = form.isFree === "true"
        if (eventIsFree && price > 0) {
          return `Tier ${i + 1}: free events require price 0 for every tier.`
        }
        if (!eventIsFree && price <= 0) {
          return `Tier ${i + 1}: paid events require a price greater than 0.`
        }
        const qty = Number.parseInt(t.quantity, 10)
        if (Number.isNaN(qty) || qty < 1) return `Tier ${i + 1}: quantity must be at least 1.`
        const minO = t.minPerOrder.trim() ? Number.parseInt(t.minPerOrder, 10) : 1
        const maxO = t.maxPerOrder.trim() ? Number.parseInt(t.maxPerOrder, 10) : undefined
        if (t.minPerOrder.trim() && (Number.isNaN(minO) || minO < 1)) {
          return `Tier ${i + 1}: minimum per order must be at least 1.`
        }
        if (maxO !== undefined && (Number.isNaN(maxO) || maxO < 1)) {
          return `Tier ${i + 1}: maximum per order must be at least 1.`
        }
        if (maxO !== undefined && minO > maxO) {
          return `Tier ${i + 1}: maximum per order must be ≥ minimum per order.`
        }
      }
      return null
    }
    return null
  }

  const goNext = () => {
    if (uploadingBanner || uploadingLogo) {
      setStepError("Please wait for the image upload to finish.")
      return
    }
    const err = validateStep(step)
    if (err) {
      setStepError(err)
      return
    }
    setStepError("")
    setStep((x) => Math.min(STEPS.length, x + 1))
  }

  const goPrev = () => {
    setStepError("")
    setStep((x) => Math.max(1, x - 1))
  }

  const resolveCategoryForPayload = (): string => {
    if (form.categoryPreset === "other") return form.categoryCustom.trim()
    if (form.categoryPreset === "_none") return ""
    return form.categoryPreset
  }

  const buildPayload = (
    uploadedBannerUrl?: string,
    uploadedLogoUrl?: string,
  ): UpdateMerchantEventWithTiersPayload => {
    const metadata: Record<string, unknown> = {}
    const category = resolveCategoryForPayload()
    if (category) metadata.category = category
    if (form.audience.trim()) metadata.audience = form.audience.trim()

    const eventCurrency = form.currency.trim() || "UGX"

    const tierPayloads: CreateMerchantEventTierPayload[] = tiers.map((t) => {
      const row: CreateMerchantEventTierPayload = {
        name: t.name.trim(),
        price: Number.parseFloat(t.price),
        quantity: Number.parseInt(t.quantity, 10),
      }
      if (t.serverTierId?.trim()) row.id = t.serverTierId.trim()
      const tc = normalizeCode(t.tierCode.trim())
      if (tc) row.tierCode = tc
      if (t.description.trim()) row.description = t.description.trim()
      const cur = t.currency.trim() || eventCurrency
      if (cur) row.currency = cur
      const minO = t.minPerOrder.trim() ? Number.parseInt(t.minPerOrder, 10) : 1
      if (minO > 1 || t.minPerOrder.trim()) row.minPerOrder = minO
      if (t.maxPerOrder.trim()) row.maxPerOrder = Number.parseInt(t.maxPerOrder, 10)
      row.salesStartAt = datetimeLocalToIso(t.salesStartAt) || null
      row.salesEndAt = datetimeLocalToIso(t.salesEndAt) || null
      return row
    })

    const startsAt = datetimeLocalToIso(form.startsAt)
    const payload: UpdateMerchantEventWithTiersPayload = {
      title: form.title.trim(),
      startsAt: startsAt || null,
      scheduleNote: form.scheduleNote.trim() || null,
      endsAt: datetimeLocalToIso(form.endsAt) || null,
      salesStartAt: datetimeLocalToIso(form.salesStartAt) || null,
      salesEndAt: datetimeLocalToIso(form.salesEndAt) || null,
      tiers: tierPayloads,
      currency: eventCurrency,
      isPublic: form.isPublic === "true",
      isFree: form.isFree === "true",
    }

    if (form.description.trim()) payload.description = form.description.trim()
    const bannerUrl = normalizeBannerPath(uploadedBannerUrl ?? form.bannerUrl)
    if (bannerUrl) payload.bannerUrl = bannerUrl
    payload.logoUrl = normalizeBannerPath(uploadedLogoUrl ?? form.logoUrl) || null
    if (form.location.trim()) payload.location = form.location.trim()
    if (form.capacity.trim()) payload.capacity = Number.parseInt(form.capacity, 10)
    if (Object.keys(metadata).length) payload.metadata = metadata

    return payload
  }

  const handleSubmit = async () => {
    if (!eventId) return
    const err = validateStep(4)
    if (err) {
      setStepError(err)
      return
    }
    setStepError("")
    setSubmitting(true)
    try {
      let uploadedBannerUrl = normalizeBannerPath(form.bannerUrl)
      if (bannerFile) {
        setUploadingBanner(true)
        const uploaded = await uploadEventBanner(bannerFile)
        uploadedBannerUrl = normalizeBannerPath(uploaded.bannerUrl)
      }
      let uploadedLogoUrl = normalizeBannerPath(form.logoUrl)
      if (logoFile) {
        setUploadingLogo(true)
        const uploaded = await uploadEventLogo(logoFile)
        uploadedLogoUrl = normalizeBannerPath(uploaded.logoUrl)
      }

      await updateMerchantEventWithTiers(eventId, buildPayload(uploadedBannerUrl, uploadedLogoUrl))
      toast.success("Event updated.")
      onOpenChange(false)
      onUpdated()
    } catch (e) {
      console.error(e)
      toast.error(getApiErrorMessage(e))
    } finally {
      setUploadingBanner(false)
      setUploadingLogo(false)
      setSubmitting(false)
    }
  }

  const formDisabled = Boolean(disabled || loadingDetail)

  const updateTier = (key: string, patch: Partial<TierRow>) => {
    setTiers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const addTier = () =>
    setTiers((rows) => [
      ...rows,
      { ...newTierRow(), price: form.isFree === "true" ? "0" : "" },
    ])
  const removeTier = (key: string) => {
    setTiers((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)))
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto gap-0 p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Edit event</DialogTitle>
            {!loadingDetail && !loadError ? (
              <p className="text-sm text-muted-foreground font-normal pt-1">
                Step {step} of {STEPS.length}: {STEPS[step - 1].title} — {STEPS[step - 1].description}
              </p>
            ) : null}
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
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
            ) : (
              <>
            {stepError ? (
              <p className="text-sm text-red-600" role="alert">
                {stepError}
              </p>
            ) : null}

            {step === 1 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-title">
                      Title <Req />
                    </Label>
                  </div>
                  <Input
                    id="ee-title"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="RukaPay Business Summit 2026"
                    disabled={formDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ee-desc" className="inline-flex flex-wrap items-center gap-x-1">
                    Description <Opt />
                  </Label>
                  <Textarea
                    id="ee-desc"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Describe your event…"
                    rows={3}
                    disabled={formDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="inline-flex flex-wrap items-center gap-x-1">
                      Company logo <Opt />
                    </Label>
                    <FieldHint>
                      Square company mark shown above the event title. JPEG, PNG, WebP, or GIF — max 5MB. PNG with a transparent background works best. Clearing this removes a saved logo.
                    </FieldHint>
                  </div>
                  <BannerUploadCard
                    variant="logo"
                    value={form.logoUrl}
                    selectedFile={logoFile}
                    onFileChange={(file) => {
                      setLogoFile(file)
                      if (!file) updateField("logoUrl", "")
                    }}
                    disabled={formDisabled || submitting}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="inline-flex flex-wrap items-center gap-x-1">
                      Event banner <Opt />
                    </Label>
                    <FieldHint>
                      Wide image for the event page. JPEG, PNG, WebP, or GIF — max 5MB.
                    </FieldHint>
                  </div>
                  <BannerUploadCard
                    value={form.bannerUrl}
                    selectedFile={bannerFile}
                    onFileChange={(file) => {
                      setBannerFile(file)
                      if (!file) updateField("bannerUrl", "")
                    }}
                    disabled={formDisabled || submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ee-loc" className="inline-flex flex-wrap items-center gap-x-1">
                    Location <Opt />
                  </Label>
                  <Input
                    id="ee-loc"
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Venue name or address"
                    disabled={formDisabled}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-starts" className="inline-flex flex-wrap items-center gap-x-1">
                      Event starts <Opt />
                    </Label>
                    <FieldHint>Clear this on an existing event and use When it happens instead, for example Every Friday. Leave the end and sales dates blank so tickets stay on sale until you mark the event inactive.</FieldHint>
                  </div>
                  <Input
                    id="ee-starts"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => updateField("startsAt", e.target.value)}
                    disabled={formDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-note" className="inline-flex flex-wrap items-center gap-x-1">
                      When it happens <Opt />
                    </Label>
                    <FieldHint>Use this instead of a start date for a repeating event, e.g. Every Friday. Sales stay open until you mark the event inactive.</FieldHint>
                  </div>
                  <Input
                    id="ee-note"
                    value={form.scheduleNote}
                    onChange={(e) => updateField("scheduleNote", e.target.value)}
                    placeholder="Every Friday"
                    maxLength={120}
                    disabled={formDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-ends" className="inline-flex flex-wrap items-center gap-x-1">
                      Event ends <Opt />
                    </Label>
                    <FieldHint>Leave blank for open-ended or single-moment events.</FieldHint>
                  </div>
                  <Input
                    id="ee-ends"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => updateField("endsAt", e.target.value)}
                    disabled={formDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-ss" className="inline-flex flex-wrap items-center gap-x-1">
                      Sales start <Opt />
                    </Label>
                    <FieldHint>First moment buyers can purchase tickets. Can differ from event start.</FieldHint>
                  </div>
                  <Input
                    id="ee-ss"
                    type="datetime-local"
                    value={form.salesStartAt}
                    onChange={(e) => updateField("salesStartAt", e.target.value)}
                    disabled={formDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-se" className="inline-flex flex-wrap items-center gap-x-1">
                      Sales end <Opt />
                    </Label>
                    <FieldHint>Last moment ticket sales are allowed. Often before or at event start.</FieldHint>
                  </div>
                  <Input
                    id="ee-se"
                    type="datetime-local"
                    value={form.salesEndAt}
                    onChange={(e) => updateField("salesEndAt", e.target.value)}
                    disabled={formDisabled}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-currency" className="inline-flex flex-wrap items-center gap-x-1">
                      Currency <Req />
                    </Label>
                    <FieldHint>Default currency for ticket prices and payouts (ISO-style code, e.g. UGX).</FieldHint>
                  </div>
                  <Input
                    id="ee-currency"
                    value={form.currency}
                    onChange={(e) => updateField("currency", e.target.value.toUpperCase())}
                    placeholder="UGX"
                    maxLength={10}
                    disabled={formDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium inline-flex flex-wrap items-center gap-x-1">
                      Event type <Req />
                    </span>
                    <FieldHint>
                      Free events register attendees without payment; all ticket tiers must be price 0. Paid
                      events require every tier to have a price greater than 0.
                    </FieldHint>
                  </div>
                  <Select
                    value={form.isFree}
                    onValueChange={setEventPricingType}
                    disabled={formDisabled}
                  >
                    <SelectTrigger id="ee-pricing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Paid event</SelectItem>
                      <SelectItem value="true">Free event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium inline-flex flex-wrap items-center gap-x-1">
                      Visibility <Req />
                    </span>
                    <FieldHint>
                      Public events can be discovered in listings; private are only for people with a link or invite.
                    </FieldHint>
                  </div>
                  <Select
                    value={form.isPublic}
                    onValueChange={(v) => updateField("isPublic", v)}
                    disabled={formDisabled}
                  >
                    <SelectTrigger id="ee-public">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Public</SelectItem>
                      <SelectItem value="false">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-cap" className="inline-flex flex-wrap items-center gap-x-1">
                      Capacity <Opt />
                    </Label>
                    <FieldHint>Maximum total attendees for the whole event. Tier quantities can further limit tickets.</FieldHint>
                  </div>
                  <Input
                    id="ee-cap"
                    type="number"
                    min={1}
                    step={1}
                    value={form.capacity}
                    onChange={(e) => updateField("capacity", e.target.value)}
                    placeholder="500"
                    disabled={formDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-cat" className="inline-flex flex-wrap items-center gap-x-1">
                      Category <Opt />
                    </Label>
                    <FieldHint>Helps organize and filter your events in the dashboard and for buyers.</FieldHint>
                  </div>
                  <Select
                    value={form.categoryPreset}
                    onValueChange={(v) => updateField("categoryPreset", v)}
                    disabled={formDisabled}
                  >
                    <SelectTrigger id="ee-cat">
                      <SelectValue placeholder="Select a category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.categoryPreset === "other" ? (
                    <div className="space-y-2 pt-1">
                      <Label htmlFor="ee-cat-custom" className="inline-flex flex-wrap items-center gap-x-1">
                        Specify category <Opt />
                      </Label>
                      <Input
                        id="ee-cat-custom"
                        value={form.categoryCustom}
                        onChange={(e) => updateField("categoryCustom", e.target.value)}
                        placeholder="e.g. product launch"
                        disabled={formDisabled}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ee-aud" className="inline-flex flex-wrap items-center gap-x-1">
                      Audience <Opt />
                    </Label>
                    <FieldHint>Who this event is for (e.g. merchants, partners). Shown in listings if you use it.</FieldHint>
                  </div>
                  <Input
                    id="ee-aud"
                    value={form.audience}
                    onChange={(e) => updateField("audience", e.target.value)}
                    placeholder="merchants"
                    disabled={formDisabled}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {tiers.map((t, idx) => (
                  <div
                    key={t.key}
                    className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">Tier {idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeTier(t.key)}
                        disabled={formDisabled || tiers.length <= 1}
                        aria-label={`Remove tier ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ee-t${t.key}-code`} className="inline-flex flex-wrap items-center gap-x-1">
                            Tier code <Opt />
                          </Label>
                          <FieldHint>
                            Optional short label (e.g. VIP) for reports and checkout. Letters, numbers, hyphens only.
                          </FieldHint>
                        </div>
                        <Input
                          id={`ee-t${t.key}-code`}
                          value={t.tierCode}
                          onChange={(e) => updateTier(t.key, { tierCode: normalizeCode(e.target.value) })}
                          placeholder="GA"
                          disabled={formDisabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`ee-t${t.key}-name`} className="inline-flex flex-wrap items-center gap-x-1">
                          Name <Req />
                        </Label>
                        <Input
                          id={`ee-t${t.key}-name`}
                          value={t.name}
                          onChange={(e) => updateTier(t.key, { name: e.target.value })}
                          placeholder="General Admission"
                          disabled={formDisabled}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`ee-t${t.key}-tdesc`} className="inline-flex flex-wrap items-center gap-x-1">
                          Description <Opt />
                        </Label>
                        <Input
                          id={`ee-t${t.key}-tdesc`}
                          value={t.description}
                          onChange={(e) => updateTier(t.key, { description: e.target.value })}
                          placeholder="Optional"
                          disabled={formDisabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`ee-t${t.key}-price`} className="inline-flex flex-wrap items-center gap-x-1">
                          Price <Req />
                        </Label>
                        <Input
                          id={`ee-t${t.key}-price`}
                          type="number"
                          min={form.isFree === "true" ? 0 : 0.01}
                          step="0.01"
                          value={form.isFree === "true" ? "0" : t.price}
                          onChange={(e) => updateTier(t.key, { price: e.target.value })}
                          placeholder={form.isFree === "true" ? "0" : "50000"}
                          disabled={formDisabled || form.isFree === "true"}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ee-t${t.key}-cur`} className="inline-flex flex-wrap items-center gap-x-1">
                            Currency <Opt />
                          </Label>
                          <FieldHint>Leave blank to use the event default currency.</FieldHint>
                        </div>
                        <Input
                          id={`ee-t${t.key}-cur`}
                          value={t.currency}
                          onChange={(e) =>
                            updateTier(t.key, { currency: e.target.value.toUpperCase() })
                          }
                          placeholder={`Default: ${form.currency || "UGX"}`}
                          disabled={formDisabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`ee-t${t.key}-qty`} className="inline-flex flex-wrap items-center gap-x-1">
                          Quantity <Req />
                        </Label>
                        <Input
                          id={`ee-t${t.key}-qty`}
                          type="number"
                          min={1}
                          step={1}
                          value={t.quantity}
                          onChange={(e) => updateTier(t.key, { quantity: e.target.value })}
                          disabled={formDisabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ee-t${t.key}-min`} className="inline-flex flex-wrap items-center gap-x-1">
                            Min per order <Opt />
                          </Label>
                          <FieldHint>Minimum tickets in one purchase. Defaults to 1 if left blank.</FieldHint>
                        </div>
                        <Input
                          id={`ee-t${t.key}-min`}
                          type="number"
                          min={1}
                          step={1}
                          value={t.minPerOrder}
                          onChange={(e) => updateTier(t.key, { minPerOrder: e.target.value })}
                          disabled={formDisabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ee-t${t.key}-max`} className="inline-flex flex-wrap items-center gap-x-1">
                            Max per order <Opt />
                          </Label>
                          <FieldHint>Cap tickets per checkout. Leave blank for no extra limit beyond tier quantity.</FieldHint>
                        </div>
                        <Input
                          id={`ee-t${t.key}-max`}
                          type="number"
                          min={1}
                          step={1}
                          value={t.maxPerOrder}
                          onChange={(e) => updateTier(t.key, { maxPerOrder: e.target.value })}
                          placeholder="Optional"
                          disabled={formDisabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ee-t${t.key}-tss`} className="inline-flex flex-wrap items-center gap-x-1">
                            Tier sales start <Opt />
                          </Label>
                          <FieldHint>Leave blank to sell this tier whenever the event is active. Clearing a saved date removes it.</FieldHint>
                        </div>
                        <Input
                          id={`ee-t${t.key}-tss`}
                          type="datetime-local"
                          value={t.salesStartAt}
                          onChange={(e) => updateTier(t.key, { salesStartAt: e.target.value })}
                          disabled={formDisabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ee-t${t.key}-tse`} className="inline-flex flex-wrap items-center gap-x-1">
                            Tier sales end <Opt />
                          </Label>
                          <FieldHint>Leave blank so this tier does not stop selling on its own. A past end date closes ticket sales.</FieldHint>
                        </div>
                        <Input
                          id={`ee-t${t.key}-tse`}
                          type="datetime-local"
                          value={t.salesEndAt}
                          onChange={(e) => updateTier(t.key, { salesEndAt: e.target.value })}
                          disabled={formDisabled}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={addTier}
                  disabled={formDisabled}
                >
                  <Plus className="h-4 w-4" />
                  Add tier
                </Button>
              </div>
            )}
              </>
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <div className="flex flex-1 justify-end gap-2">
              {loadingDetail || loadError ? null : (
                <>
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={goPrev} disabled={submitting}>
                      Previous
                    </Button>
                  ) : null}
                  {step < STEPS.length ? (
                    <Button
                      type="button"
                      onClick={goNext}
                      disabled={formDisabled || submitting || uploadingBanner || uploadingLogo}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={formDisabled || submitting || uploadingBanner || uploadingLogo}
                    >
                      {submitting ? "Updating…" : "Update event"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
