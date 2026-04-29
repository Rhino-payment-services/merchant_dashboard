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
import { CircleHelp, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getMyBusinessWallet } from "@/lib/api/team.api"
import {
  createMerchantEventWithTiers,
  uploadEventBanner,
  type CreateMerchantEventTierPayload,
  type CreateMerchantEventWithTiersPayload,
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

function newTierRow(): TierRow {
  return {
    key: crypto.randomUUID(),
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

type TierRow = {
  key: string
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

type FormFields = {
  title: string
  eventCode: string
  description: string
  bannerUrl: string
  location: string
  startsAt: string
  endsAt: string
  salesStartAt: string
  salesEndAt: string
  currency: string
  isPublic: string
  capacity: string
  categoryPreset: string
  categoryCustom: string
  audience: string
}

const emptyForm = (): FormFields => ({
  title: "",
  eventCode: "",
  description: "",
  bannerUrl: "",
  location: "",
  startsAt: "",
  endsAt: "",
  salesStartAt: "",
  salesEndAt: "",
  currency: "UGX",
  isPublic: "true",
  capacity: "",
  categoryPreset: "_none",
  categoryCustom: "",
  audience: "",
})

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
  return "Could not create event. Try again."
}

const STEPS = [
  { id: 1, title: "Event details", description: "Title, venue, and media" },
  { id: 2, title: "Schedule", description: "Event and sales windows" },
  { id: 3, title: "Sales settings", description: "Currency, visibility, capacity" },
  { id: 4, title: "Ticket tiers", description: "At least one pricing tier" },
] as const

export type CreateEventDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  disabled?: boolean
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onCreated,
  disabled,
}: CreateEventDialogProps) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormFields>(emptyForm)
  const [tiers, setTiers] = useState<TierRow[]>(() => [newTierRow()])
  const [submitting, setSubmitting] = useState(false)
  const [defaultWalletId, setDefaultWalletId] = useState("")
  const [stepError, setStepError] = useState("")
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const reset = useCallback(() => {
    setStep(1)
    setForm(emptyForm())
    setTiers([newTierRow()])
    setStepError("")
    setSubmitting(false)
    setDefaultWalletId("")
    setBannerFile(null)
    setUploadingBanner(false)
  }, [])

  useEffect(() => {
    if (!open) return
    reset()
    let cancelled = false
    ;(async () => {
      try {
        const w = await getMyBusinessWallet()
        if (!cancelled) setDefaultWalletId(w.id)
      } catch {
        if (!cancelled) setDefaultWalletId("")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, reset])

  const updateField = <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!form.title.trim()) return "Enter an event title."
      if (form.eventCode.trim()) {
        const c = normalizeCode(form.eventCode.trim())
        if (!CODE_PATTERN.test(c) || c.length > 64) {
          return "Event code: uppercase letters, numbers, hyphens only (max 64)."
        }
      }
      return null
    }
    if (s === 2) {
      if (!form.startsAt.trim()) return "Choose an event start date and time."
      const startIso = datetimeLocalToIso(form.startsAt)
      if (!startIso) return "Invalid event start date."
      if (form.endsAt.trim()) {
        const endIso = datetimeLocalToIso(form.endsAt)
        if (!endIso) return "Invalid event end date."
        if (new Date(endIso) < new Date(startIso)) return "End must be after start."
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
    if (uploadingBanner) {
      setStepError("Please wait for the banner upload to finish.")
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

  const buildPayload = (uploadedBannerUrl?: string): CreateMerchantEventWithTiersPayload => {
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
      const tc = normalizeCode(t.tierCode.trim())
      if (tc) row.tierCode = tc
      if (t.description.trim()) row.description = t.description.trim()
      const cur = t.currency.trim() || eventCurrency
      if (cur) row.currency = cur
      const minO = t.minPerOrder.trim() ? Number.parseInt(t.minPerOrder, 10) : 1
      if (minO > 1 || t.minPerOrder.trim()) row.minPerOrder = minO
      if (t.maxPerOrder.trim()) row.maxPerOrder = Number.parseInt(t.maxPerOrder, 10)
      const tss = datetimeLocalToIso(t.salesStartAt)
      const tse = datetimeLocalToIso(t.salesEndAt)
      if (tss) row.salesStartAt = tss
      if (tse) row.salesEndAt = tse
      return row
    })

    const startsAt = datetimeLocalToIso(form.startsAt)!
    const payload: CreateMerchantEventWithTiersPayload = {
      title: form.title.trim(),
      startsAt,
      tiers: tierPayloads,
      currency: eventCurrency,
      isPublic: form.isPublic === "true",
    }

    const ec = normalizeCode(form.eventCode.trim())
    if (ec) payload.eventCode = ec
    if (defaultWalletId.trim()) payload.walletId = defaultWalletId.trim()
    if (form.description.trim()) payload.description = form.description.trim()
    const bannerUrl = normalizeBannerPath(uploadedBannerUrl ?? form.bannerUrl)
    if (bannerUrl) payload.bannerUrl = bannerUrl
    if (form.location.trim()) payload.location = form.location.trim()
    const endsAt = datetimeLocalToIso(form.endsAt)
    if (endsAt) payload.endsAt = endsAt
    const salesS = datetimeLocalToIso(form.salesStartAt)
    const salesE = datetimeLocalToIso(form.salesEndAt)
    if (salesS) payload.salesStartAt = salesS
    if (salesE) payload.salesEndAt = salesE
    if (form.capacity.trim()) payload.capacity = Number.parseInt(form.capacity, 10)
    if (Object.keys(metadata).length) payload.metadata = metadata

    return payload
  }

  const handleSubmit = async () => {
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

      await createMerchantEventWithTiers(buildPayload(uploadedBannerUrl))
      toast.success("Event created.")
      onOpenChange(false)
      onCreated()
    } catch (e) {
      console.error(e)
      toast.error(getApiErrorMessage(e))
    } finally {
      setUploadingBanner(false)
      setSubmitting(false)
    }
  }

  const updateTier = (key: string, patch: Partial<TierRow>) => {
    setTiers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const addTier = () => setTiers((rows) => [...rows, newTierRow()])
  const removeTier = (key: string) => {
    setTiers((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)))
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto gap-0 p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Create event</DialogTitle>
            <p className="text-sm text-muted-foreground font-normal pt-1">
              Step {step} of {STEPS.length}: {STEPS[step - 1].title} — {STEPS[step - 1].description}
            </p>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            {stepError ? (
              <p className="text-sm text-red-600" role="alert">
                {stepError}
              </p>
            ) : null}

            {step === 1 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ce-title">
                      Title <Req />
                    </Label>
                  </div>
                  <Input
                    id="ce-title"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="RukaPay Business Summit 2026"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ce-code" className="inline-flex flex-wrap items-center gap-x-1 gap-y-0">
                      Event code <Opt />
                    </Label>
                    <FieldHint>
                      Optional short code (letters, numbers, hyphens) for links and internal reference.
                    </FieldHint>
                  </div>
                  <Input
                    id="ce-code"
                    value={form.eventCode}
                    onChange={(e) => updateField("eventCode", normalizeCode(e.target.value))}
                    placeholder="RUKA-BIZ-2026"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ce-desc" className="inline-flex flex-wrap items-center gap-x-1">
                    Description <Opt />
                  </Label>
                  <Textarea
                    id="ce-desc"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Describe your event…"
                    rows={3}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="inline-flex flex-wrap items-center gap-x-1">
                      Event banner <Opt />
                    </Label>
                    <FieldHint>
                      Upload an image for the event page. JPEG, PNG, WebP, or GIF — max 5MB.
                    </FieldHint>
                  </div>
                  <BannerUploadCard
                    value={form.bannerUrl}
                    selectedFile={bannerFile}
                    onFileChange={(file) => {
                      setBannerFile(file)
                      if (!file) updateField("bannerUrl", "")
                    }}
                    disabled={disabled || submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ce-loc" className="inline-flex flex-wrap items-center gap-x-1">
                    Location <Opt />
                  </Label>
                  <Input
                    id="ce-loc"
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Venue name or address"
                    disabled={disabled}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ce-starts" className="inline-flex flex-wrap items-center gap-x-1">
                      Event starts <Req />
                    </Label>
                    <FieldHint>When the event itself begins (not necessarily when ticket sales open).</FieldHint>
                  </div>
                  <Input
                    id="ce-starts"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => updateField("startsAt", e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ce-ends" className="inline-flex flex-wrap items-center gap-x-1">
                      Event ends <Opt />
                    </Label>
                    <FieldHint>Leave blank for open-ended or single-moment events.</FieldHint>
                  </div>
                  <Input
                    id="ce-ends"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => updateField("endsAt", e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ce-ss" className="inline-flex flex-wrap items-center gap-x-1">
                      Sales start <Opt />
                    </Label>
                    <FieldHint>First moment buyers can purchase tickets. Can differ from event start.</FieldHint>
                  </div>
                  <Input
                    id="ce-ss"
                    type="datetime-local"
                    value={form.salesStartAt}
                    onChange={(e) => updateField("salesStartAt", e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ce-se" className="inline-flex flex-wrap items-center gap-x-1">
                      Sales end <Opt />
                    </Label>
                    <FieldHint>Last moment ticket sales are allowed. Often before or at event start.</FieldHint>
                  </div>
                  <Input
                    id="ce-se"
                    type="datetime-local"
                    value={form.salesEndAt}
                    onChange={(e) => updateField("salesEndAt", e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ce-currency" className="inline-flex flex-wrap items-center gap-x-1">
                      Currency <Req />
                    </Label>
                    <FieldHint>Default currency for ticket prices and payouts (ISO-style code, e.g. UGX).</FieldHint>
                  </div>
                  <Input
                    id="ce-currency"
                    value={form.currency}
                    onChange={(e) => updateField("currency", e.target.value.toUpperCase())}
                    placeholder="UGX"
                    maxLength={10}
                    disabled={disabled}
                  />
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
                    disabled={disabled}
                  >
                    <SelectTrigger id="ce-public">
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
                    <Label htmlFor="ce-cap" className="inline-flex flex-wrap items-center gap-x-1">
                      Capacity <Opt />
                    </Label>
                    <FieldHint>Maximum total attendees for the whole event. Tier quantities can further limit tickets.</FieldHint>
                  </div>
                  <Input
                    id="ce-cap"
                    type="number"
                    min={1}
                    step={1}
                    value={form.capacity}
                    onChange={(e) => updateField("capacity", e.target.value)}
                    placeholder="500"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ce-cat" className="inline-flex flex-wrap items-center gap-x-1">
                      Category <Opt />
                    </Label>
                    <FieldHint>Helps organize and filter your events in the dashboard and for buyers.</FieldHint>
                  </div>
                  <Select
                    value={form.categoryPreset}
                    onValueChange={(v) => updateField("categoryPreset", v)}
                    disabled={disabled}
                  >
                    <SelectTrigger id="ce-cat">
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
                      <Label htmlFor="ce-cat-custom" className="inline-flex flex-wrap items-center gap-x-1">
                        Specify category <Opt />
                      </Label>
                      <Input
                        id="ce-cat-custom"
                        value={form.categoryCustom}
                        onChange={(e) => updateField("categoryCustom", e.target.value)}
                        placeholder="e.g. product launch"
                        disabled={disabled}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ce-aud" className="inline-flex flex-wrap items-center gap-x-1">
                      Audience <Opt />
                    </Label>
                    <FieldHint>Who this event is for (e.g. merchants, partners). Shown in listings if you use it.</FieldHint>
                  </div>
                  <Input
                    id="ce-aud"
                    value={form.audience}
                    onChange={(e) => updateField("audience", e.target.value)}
                    placeholder="merchants"
                    disabled={disabled}
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
                        disabled={disabled || tiers.length <= 1}
                        aria-label={`Remove tier ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ce-t${t.key}-code`} className="inline-flex flex-wrap items-center gap-x-1">
                            Tier code <Opt />
                          </Label>
                          <FieldHint>
                            Optional short label (e.g. VIP) for reports and checkout. Letters, numbers, hyphens only.
                          </FieldHint>
                        </div>
                        <Input
                          id={`ce-t${t.key}-code`}
                          value={t.tierCode}
                          onChange={(e) => updateTier(t.key, { tierCode: normalizeCode(e.target.value) })}
                          placeholder="GA"
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`ce-t${t.key}-name`} className="inline-flex flex-wrap items-center gap-x-1">
                          Name <Req />
                        </Label>
                        <Input
                          id={`ce-t${t.key}-name`}
                          value={t.name}
                          onChange={(e) => updateTier(t.key, { name: e.target.value })}
                          placeholder="General Admission"
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`ce-t${t.key}-tdesc`} className="inline-flex flex-wrap items-center gap-x-1">
                          Description <Opt />
                        </Label>
                        <Input
                          id={`ce-t${t.key}-tdesc`}
                          value={t.description}
                          onChange={(e) => updateTier(t.key, { description: e.target.value })}
                          placeholder="Optional"
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`ce-t${t.key}-price`} className="inline-flex flex-wrap items-center gap-x-1">
                          Price <Req />
                        </Label>
                        <Input
                          id={`ce-t${t.key}-price`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={t.price}
                          onChange={(e) => updateTier(t.key, { price: e.target.value })}
                          placeholder="50000"
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ce-t${t.key}-cur`} className="inline-flex flex-wrap items-center gap-x-1">
                            Currency <Opt />
                          </Label>
                          <FieldHint>Leave blank to use the event default currency.</FieldHint>
                        </div>
                        <Input
                          id={`ce-t${t.key}-cur`}
                          value={t.currency}
                          onChange={(e) =>
                            updateTier(t.key, { currency: e.target.value.toUpperCase() })
                          }
                          placeholder={`Default: ${form.currency || "UGX"}`}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`ce-t${t.key}-qty`} className="inline-flex flex-wrap items-center gap-x-1">
                          Quantity <Req />
                        </Label>
                        <Input
                          id={`ce-t${t.key}-qty`}
                          type="number"
                          min={1}
                          step={1}
                          value={t.quantity}
                          onChange={(e) => updateTier(t.key, { quantity: e.target.value })}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ce-t${t.key}-min`} className="inline-flex flex-wrap items-center gap-x-1">
                            Min per order <Opt />
                          </Label>
                          <FieldHint>Minimum tickets in one purchase. Defaults to 1 if left blank.</FieldHint>
                        </div>
                        <Input
                          id={`ce-t${t.key}-min`}
                          type="number"
                          min={1}
                          step={1}
                          value={t.minPerOrder}
                          onChange={(e) => updateTier(t.key, { minPerOrder: e.target.value })}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ce-t${t.key}-max`} className="inline-flex flex-wrap items-center gap-x-1">
                            Max per order <Opt />
                          </Label>
                          <FieldHint>Cap tickets per checkout. Leave blank for no extra limit beyond tier quantity.</FieldHint>
                        </div>
                        <Input
                          id={`ce-t${t.key}-max`}
                          type="number"
                          min={1}
                          step={1}
                          value={t.maxPerOrder}
                          onChange={(e) => updateTier(t.key, { maxPerOrder: e.target.value })}
                          placeholder="Optional"
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ce-t${t.key}-tss`} className="inline-flex flex-wrap items-center gap-x-1">
                            Tier sales start <Opt />
                          </Label>
                          <FieldHint>Override event-wide sales window for this tier only.</FieldHint>
                        </div>
                        <Input
                          id={`ce-t${t.key}-tss`}
                          type="datetime-local"
                          value={t.salesStartAt}
                          onChange={(e) => updateTier(t.key, { salesStartAt: e.target.value })}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`ce-t${t.key}-tse`} className="inline-flex flex-wrap items-center gap-x-1">
                            Tier sales end <Opt />
                          </Label>
                          <FieldHint>Override event-wide sales end for this tier only.</FieldHint>
                        </div>
                        <Input
                          id={`ce-t${t.key}-tse`}
                          type="datetime-local"
                          value={t.salesEndAt}
                          onChange={(e) => updateTier(t.key, { salesEndAt: e.target.value })}
                          disabled={disabled}
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
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4" />
                  Add tier
                </Button>
              </div>
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
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={goPrev} disabled={submitting}>
                  Previous
                </Button>
              ) : null}
              {step < STEPS.length ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={disabled || submitting || uploadingBanner}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={disabled || submitting || uploadingBanner}
                >
                  {submitting ? "Creating…" : "Create event"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
