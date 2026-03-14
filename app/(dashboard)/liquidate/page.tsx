"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft, Droplets, Landmark, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { getWalletBalance } from "@/lib/api/wallet.api";
import { sweepToDisbursement } from "@/lib/api/wallet.api";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useUserProfile } from "../UserProfileProvider";

const SWEEP_FEE_PERCENT = 2.5;
const fmt = (n: number, currency = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

export default function LiquidatePage() {
  const { profile } = useUserProfile();
  const { data: session } = useSession();
  const [collectionBalance, setCollectionBalance] = useState<number | null>(null);
  const [disbursementBalance, setDisbursementBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweepAmount, setSweepAmount] = useState("");
  const [sweepLoading, setSweepLoading] = useState(false);

  const merchantCode = (session?.user as any)?.merchantCode as string | undefined;
  const gross = parseFloat(sweepAmount) || 0;
  const fee = useMemo(() => Number((gross * SWEEP_FEE_PERCENT / 100).toFixed(0)), [gross]);
  const net = gross - fee;
  const canSweep =
    gross > 0 &&
    net > 0 &&
    collectionBalance !== null &&
    gross <= collectionBalance;

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const data = await getWalletBalance();
      setCollectionBalance(data.collectionBalance ?? null);
      setDisbursementBalance(data.disbursementBalance ?? null);
    } catch (err) {
      console.error("Error fetching wallet:", err);
      toast.error("Failed to load wallet balances");
      setCollectionBalance(null);
      setDisbursementBalance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const handleSweep = async () => {
    if (!canSweep) return;
    setSweepLoading(true);
    try {
      await sweepToDisbursement(gross, merchantCode);
      toast.success(
        `Liquidated ${fmt(gross)} gross → ${fmt(net)} credited to disbursement`
      );
      setSweepAmount("");
      await fetchBalances();
    } catch (err: any) {
      toast.error(err?.message || "Failed to transfer to disbursement");
    } finally {
      setSweepLoading(false);
    }
  };

  const hasSplitWallets =
    collectionBalance !== null && disbursementBalance !== null;
  const merchantBankName = (profile as any)?.businessWallet?.merchant?.bankName
    || (profile as any)?.merchantData?.bankName;
  const hasBankAccount = !!(merchantBankName || (profile as any)?.businessWallet?.merchant?.bankAccountNumber);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Droplets className="h-7 w-7 text-main-600" />
          Liquidate
        </h1>
        <p className="text-gray-600 mt-1">
          Move funds from collection to disbursement, then send money to your bank account. Only the account owner can liquidate.
        </p>
      </div>

      {/* Liquidate: Collection → Disbursement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Liquidate to disbursement
          </CardTitle>
          <CardDescription>
            Transfer collected payments into your disbursement wallet. A {SWEEP_FEE_PERCENT}% fee applies; the net amount is credited to disbursement for payments and withdrawals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading balances…
            </div>
          ) : !hasSplitWallets ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Your business does not have separate collection and disbursement wallets. Contact support or check your account settings if you expect this feature.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Collection balance</p>
                  <p className="font-semibold text-green-600">{fmt(collectionBalance ?? 0)}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Disbursement balance</p>
                  <p className="font-semibold text-blue-600">{fmt(disbursementBalance ?? 0)}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-[180px]">
                  <Label htmlFor="sweep-amount">Amount (UGX)</Label>
                  <Input
                    id="sweep-amount"
                    type="number"
                    min={1}
                    max={collectionBalance ?? 0}
                    placeholder="Enter amount"
                    value={sweepAmount}
                    onChange={(e) => setSweepAmount(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <Button
                  onClick={handleSweep}
                  disabled={!canSweep || sweepLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sweepLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Liquidate
                    </>
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={fetchBalances} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              {gross > 0 && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>Gross</span>
                    <span className="font-medium">{fmt(gross)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Fee ({SWEEP_FEE_PERCENT}%)</span>
                    <span>− {fmt(fee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-700 border-t border-blue-100 pt-1.5 mt-0.5">
                    <span>Net to disbursement</span>
                    <span>{fmt(net)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Withdraw to bank */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5 text-main-600" />
            Send money to your bank account
          </CardTitle>
          <CardDescription>
            Withdraw from your disbursement balance to your registered bank account. Use the Withdraw flow to send funds to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasBankAccount && merchantBankName && (
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-0.5">Registered bank</p>
              <p className="font-medium text-gray-900">{merchantBankName}</p>
              <p className="text-xs text-gray-500 mt-1">Add or update bank details in KYC Verification or Settings.</p>
            </div>
          )}
          {!hasBankAccount && (
            <p className="text-sm text-gray-600">
              Add your bank account in KYC Verification or Settings so you can withdraw to it.
            </p>
          )}
          <Button asChild className="bg-main-600 hover:bg-main-700">
            <Link href="/transfer">
              <Landmark className="h-4 w-4 mr-2" />
              Go to Withdraw
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
