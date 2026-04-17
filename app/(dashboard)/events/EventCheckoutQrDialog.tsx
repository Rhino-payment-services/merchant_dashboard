"use client"

import React, { useCallback, useEffect, useState } from "react"
import QRCode from "qrcode"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  getMerchantEventCheckoutUrl,
} from "@/lib/api/merchant-events.api"
import { toast } from "sonner"
import {
  Printer,
  Download,
  Copy,
  Share2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

async function generateQrDataUrlWithLogo(checkoutUrl: string): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(checkoutUrl, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#08163d",
      light: "#FFFFFF",
    },
  })

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    return qrDataUrl
  }

  const qrImage = new Image()
  qrImage.src = qrDataUrl
  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve()
    qrImage.onerror = () => reject(new Error("QR image load failed"))
  })

  canvas.width = qrImage.width
  canvas.height = qrImage.height
  ctx.drawImage(qrImage, 0, 0)

  try {
    const logoImage = new Image()
    logoImage.crossOrigin = "anonymous"
    logoImage.src = "/images/logo.jpg"
    await new Promise<void>((resolve) => {
      logoImage.onload = () => resolve()
      logoImage.onerror = () => resolve()
    })

    if (logoImage.complete && logoImage.naturalWidth > 0) {
      const logoSize = Math.floor(canvas.width * 0.2)
      const logoX = (canvas.width - logoSize) / 2
      const logoY = (canvas.height - logoSize) / 2
      const bgSize = logoSize + 10
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      ctx.arc(canvas.width / 2, canvas.height / 2, bgSize / 2, 0, 2 * Math.PI)
      ctx.fill()
      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize)
    }
  } catch {
    // continue without logo
  }

  return canvas.toDataURL("image/png")
}

export interface EventCheckoutQrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
  eventTitle: string
}

export function EventCheckoutQrDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: EventCheckoutQrDialogProps) {
  const [checkoutUrl, setCheckoutUrl] = useState("")
  const [eventCode, setEventCode] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [fetchLoading, setFetchLoading] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const reset = useCallback(() => {
    setCheckoutUrl("")
    setEventCode("")
    setQrCodeUrl("")
    setFetchLoading(false)
    setQrLoading(false)
    setActionLoading(false)
    setError("")
    setCopied(false)
  }, [])

  const loadCheckoutAndQr = useCallback(async () => {
    if (!eventId) return
    setFetchLoading(true)
    setQrLoading(true)
    setError("")
    setCheckoutUrl("")
    setEventCode("")
    setQrCodeUrl("")
    try {
      const data = await getMerchantEventCheckoutUrl(eventId)
      setCheckoutUrl(data.checkoutUrl)
      setEventCode(data.eventCode)
      const finalQr = await generateQrDataUrlWithLogo(data.checkoutUrl)
      setQrCodeUrl(finalQr)
    } catch (e) {
      console.error("Failed to load event checkout URL", e)
      setError("Could not load checkout link. Try again.")
      toast.error("Could not load checkout link.")
    } finally {
      setFetchLoading(false)
      setQrLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    if (eventId) {
      void loadCheckoutAndQr()
    }
  }, [open, eventId, loadCheckoutAndQr, reset])

  const handlePrint = async () => {
    if (!qrCodeUrl || !checkoutUrl) {
      toast.error("No QR code available to print")
      return
    }
    setActionLoading(true)
    try {
      const safeTitle = escapeHtml(eventTitle)
      const safeCode = escapeHtml(eventCode)
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${safeTitle} — Event checkout</title>
              <style>
                @media print {
                  @page { size: A4; margin: 0; }
                }
                body {
                  margin: 0;
                  padding: 40px;
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  text-align: center;
                  background-color: #ffffff;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                }
                .qr-container {
                  display: inline-block;
                  padding: 40px;
                  border: 3px solid #08163d;
                  border-radius: 20px;
                  background: white;
                  box-shadow: 0 10px 40px rgba(8, 22, 61, 0.1);
                }
                .qr-header {
                  margin-bottom: 20px;
                  border-bottom: 2px solid #08163d;
                  padding-bottom: 15px;
                }
                h1 {
                  color: #08163d;
                  margin: 0 0 10px 0;
                  font-size: 28px;
                  font-weight: 700;
                }
                .event-code {
                  color: #6b7280;
                  font-size: 16px;
                  margin: 5px 0;
                  font-weight: 500;
                }
                img {
                  max-width: 100%;
                  height: auto;
                  margin: 20px 0;
                  border-radius: 10px;
                }
                .instructions {
                  margin-top: 25px;
                  padding-top: 20px;
                  border-top: 2px solid #e5e7eb;
                  color: #4b5563;
                  font-size: 14px;
                  line-height: 1.6;
                }
                .scan-text {
                  font-weight: 600;
                  color: #08163d;
                  margin-bottom: 10px;
                  font-size: 18px;
                }
                .footer {
                  margin-top: 30px;
                  font-size: 12px;
                  color: #9ca3af;
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <div class="qr-header">
                  <h1>${safeTitle}</h1>
                  <div class="event-code">Event code: ${safeCode}</div>
                </div>
                <img src="${qrCodeUrl}" alt="Event checkout QR code" />
                <div class="instructions">
                  <p class="scan-text">Scan to open event checkout</p>
                  <p>1. Open your camera or browser</p>
                  <p>2. Scan this QR code</p>
                  <p>3. Complete ticket purchase on the checkout page</p>
                </div>
                <div class="footer">
                  <p>Powered by RukaPay</p>
                </div>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
        }, 500)
        toast.success("Print dialog opened")
      }
    } catch (e) {
      console.error("Error printing QR code", e)
      toast.error("Failed to print QR code")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!qrCodeUrl) {
      toast.error("No QR code available to download")
      return
    }
    setActionLoading(true)
    try {
      const link = document.createElement("a")
      const base = eventTitle.replace(/\s+/g, "_") || "event"
      link.download = `${base}_checkout_QR.png`
      link.href = qrCodeUrl
      link.click()
      toast.success("QR code downloaded")
    } catch (e) {
      console.error("Error downloading QR code", e)
      toast.error("Failed to download QR code")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!checkoutUrl) {
      toast.error("No link to copy")
      return
    }
    try {
      await navigator.clipboard.writeText(checkoutUrl)
      setCopied(true)
      toast.success("Checkout link copied")
      window.setTimeout(() => setCopied(false), 3000)
    } catch (e) {
      console.error("Error copying link", e)
      toast.error("Failed to copy link")
    }
  }

  const handleShare = async () => {
    if (!checkoutUrl) {
      toast.error("No link to share")
      return
    }
    try {
      if (navigator.share) {
        await navigator.share({
          title: eventTitle,
          text: `Get tickets: ${eventTitle}`,
          url: checkoutUrl,
        })
        toast.success("Shared successfully")
      } else {
        await handleCopyLink()
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("Error sharing", e)
      }
    }
  }

  const busy = fetchLoading || qrLoading
  const canAct = Boolean(qrCodeUrl && checkoutUrl && !error && !busy)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#08163d]">Event checkout QR</DialogTitle>
          <DialogDescription>
            Share this QR code or link so attendees can open checkout for{" "}
            <span className="font-medium text-foreground">{eventTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {busy ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-[#08163d]" aria-hidden />
              <p className="text-sm text-muted-foreground">Loading checkout link…</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void loadCheckoutAndQr()}
                disabled={!eventId}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <>
              {eventCode ? (
                <p className="text-xs text-muted-foreground">
                  Event code:{" "}
                  <span className="font-mono font-medium text-foreground">{eventCode}</span>
                </p>
              ) : null}

              {checkoutUrl ? (
                <div className="p-3 bg-muted rounded-lg break-all text-sm text-foreground">
                  {checkoutUrl}
                </div>
              ) : null}

              {qrCodeUrl ? (
                <div className="flex justify-center">
                  <div className="p-4 bg-white border-4 border-[#08163d] rounded-xl shadow-lg">
                    <img
                      src={qrCodeUrl}
                      alt=""
                      className="w-56 h-56 sm:w-64 sm:h-64"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  className="bg-[#08163d] hover:bg-[#0a1a4a] text-white gap-2"
                  onClick={() => void handlePrint()}
                  disabled={!canAct || actionLoading}
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => void handleDownload()}
                  disabled={!canAct || actionLoading}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => void handleShare()}
                  disabled={!canAct}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => void handleCopyLink()}
                  disabled={!checkoutUrl || busy}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy link
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
