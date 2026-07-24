"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRightLeft, AlertCircle } from "lucide-react"
import { sweepToDisbursement } from "@/lib/api/wallet.api"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

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

  const amount = parseFloat(rawAmount) || 0

  const isValid = amount > 0 && amount <= collectionBalance

  const handleConfirm = async () => {
    if (!isValid) return
    setLoading(true)
    try {
      const result = await sweepToDisbursement(amount, merchantCode)
      const credited = result?.netToDisbursement ?? amount
      toast.success(
        `Transferred ${fmt(credited, currency)} to disbursement (no transfer fee)`,
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
            Move to payout balance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-0.5">Collection balance</p>
              <p className="font-semibold text-green-600 text-sm">{fmt(collectionBalance, currency)}</p>
              <p className="text-[11px] text-gray-400 mt-1">Incoming customer payments (Collection wallet)</p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-0.5">Payout balance</p>
              <p className="font-semibold text-blue-600 text-sm">{fmt(disbursementBalance, currency)}</p>
              <p className="text-[11px] text-gray-400 mt-1">Available for outgoing payments (Disbursement wallet)</p>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            No fee to transfer funds to your payout balance. Collection fees were already applied when customers paid you.
          </p>

          <div>
            <Label htmlFor="sweep-amount" className="font-medium">
              Amount ({currency})
            </Label>
            <Input
              id="sweep-amount"
              type="number"
              min={1}
              max={collectionBalance}
              placeholder="Enter amount to transfer"
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              className="mt-1.5 h-11 text-base"
            />
            {amount > collectionBalance && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Exceeds collection balance
              </p>
            )}
          </div>

          {amount > 0 && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex justify-between font-semibold">
                <span>To payout balance</span>
                <span>{fmt(amount, currency)}</span>
              </div>
            </div>
          )}

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
