"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRightLeft, AlertCircle } from "lucide-react"
import { sweepToDisbursement } from "@/lib/api/wallet.api"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

const SWEEP_FEE_PERCENT = 2.5

interface SweepToDisbursementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionBalance: number
  disbursementBalance: number
  currency?: string
  onSuccess?: () => void
}

const fmt = (n: number, currency = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

export default function SweepToDisbursementModal({
  open,
  onOpenChange,
  collectionBalance,
  disbursementBalance,
  currency = "UGX",
  onSuccess,
}: SweepToDisbursementModalProps) {
  const { data: session } = useSession()
  const [rawAmount, setRawAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const merchantCode = (session?.user as any)?.merchantCode as string | undefined

  const gross = parseFloat(rawAmount) || 0
  const fee = useMemo(() => Number((gross * SWEEP_FEE_PERCENT / 100).toFixed(0)), [gross])
  const net = gross - fee

  const isValid =
    gross > 0 &&
    net > 0 &&
    gross <= collectionBalance

  const handleConfirm = async () => {
    if (!isValid) return
    setLoading(true)
    try {
      await sweepToDisbursement(gross, merchantCode)
      toast.success(
        `Transferred ${fmt(gross, currency)} gross → ${fmt(net, currency)} credited to disbursement`,
      )
      setRawAmount("")
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || "Failed to transfer to disbursement")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setRawAmount("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Transfer to Disbursement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Balance summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-0.5">Collection balance</p>
              <p className="font-semibold text-green-600 text-sm">{fmt(collectionBalance, currency)}</p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-0.5">Disbursement balance</p>
              <p className="font-semibold text-blue-600 text-sm">{fmt(disbursementBalance, currency)}</p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <Label htmlFor="sweep-gross" className="font-medium">
              Gross amount ({currency})
            </Label>
            <Input
              id="sweep-gross"
              type="number"
              min={1}
              max={collectionBalance}
              placeholder="Enter amount to transfer"
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              className="mt-1.5 h-11 text-base"
            />
            {gross > collectionBalance && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Exceeds collection balance
              </p>
            )}
          </div>

          {/* Fee breakdown */}
          {gross > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Gross amount</span>
                <span className="font-medium">{fmt(gross, currency)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>RukaPay fee ({SWEEP_FEE_PERCENT}%)</span>
                <span>− {fmt(fee, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-green-700 border-t border-blue-100 pt-1.5 mt-0.5">
                <span>Net to disbursement</span>
                <span>{fmt(net, currency)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleConfirm}
              disabled={!isValid || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Confirm transfer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
