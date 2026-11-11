'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccessDenied } from '@/app/components/AccessDenied';
import { useCreateSingleBundle, useDataBundleProducts } from '@/lib/hooks/useDataBundles';
import {
  DATA_BUNDLE_NETWORKS,
  DEFAULT_AIRTIME_LIMITS,
  type DataBundleNetwork,
  type ProductType,
  airtimeLabel,
  apiErrorMessage,
  detectNetwork,
  formatUgx,
  networkLabel,
  productsByNetwork,
} from '@/lib/utils/data-bundles';
import { useDataBundleAccessContext } from '../_components/DataBundleAccessContext';

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000];

function newClientReference(): string {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `S-${id}`.slice(0, 64);
}

export default function BuyForOnePage() {
  const router = useRouter();
  const access = useDataBundleAccessContext();
  const products = useDataBundleProducts(access.can.upload);
  const createSingle = useCreateSingleBundle();
  const limits = access.airtimeLimits ?? DEFAULT_AIRTIME_LIMITS;

  const [productType, setProductType] = useState<ProductType>('AIRTIME');
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<DataBundleNetwork | ''>('');
  const [networkPicked, setNetworkPicked] = useState(false);
  const [bundleCode, setBundleCode] = useState('');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientReference, setClientReference] = useState(newClientReference);

  const isAirtime = productType === 'AIRTIME';
  const byNetwork = useMemo(() => productsByNetwork(products.data ?? []), [products.data]);
  const options = network ? byNetwork[network] : [];
  const selected = options.find((p) => p.bundleCode === bundleCode) ?? null;
  const detected = detectNetwork(phone);
  const mismatch = !!detected && !!network && detected !== network;

  const amount = Number(amountText.replace(/[,\s]/g, ''));
  const amountEntered = amountText.trim() !== '';
  const amountError = !amountEntered
    ? null
    : !Number.isInteger(amount)
      ? 'Enter a whole number in UGX'
      : amount < limits.min || amount > limits.max
        ? `Amount must be between ${formatUgx(limits.min)} and ${formatUgx(limits.max)}`
        : null;
  const amountValid = amountEntered && !amountError;

  if (!access.can.upload) {
    return <AccessDenied description="You do not have permission to buy airtime or data bundles." />;
  }

  const changeNetwork = (next: DataBundleNetwork | '') => {
    if (next !== network) setBundleCode('');
    setNetwork(next);
  };

  const onPhoneChange = (value: string) => {
    setPhone(value);
    setError(null);
    const found = detectNetwork(value);
    if (!networkPicked && found) changeNetwork(found);
  };

  const productReady = isAirtime ? amountValid : !!selected;
  const canSubmit = !!phone.trim() && !!network && productReady && !mismatch && !createSingle.isPending;
  const purchaseText = isAirtime ? airtimeLabel(amount) : selected?.displayName ?? '';
  const price = isAirtime ? amount : selected ? Number(selected.price) : 0;

  const submit = async () => {
    if (!network || !productReady) return;
    setError(null);
    try {
      const res = await createSingle.mutateAsync({
        productType,
        phoneNumber: phone.trim(),
        ...(isAirtime ? { amount } : { bundle: selected!.bundleCode }),
        network,
        note: note.trim() || undefined,
        clientReference,
      });
      setConfirmOpen(false);
      router.push(`/data-bundles/batches/${res.batch.id}`);
    } catch (e) {
      const message = apiErrorMessage(e, 'Could not send this purchase. Please try again.');
      setError(message);
      setConfirmOpen(false);
      // The failed attempt was discarded by the server, so the next try needs a fresh reference.
      setClientReference(newClientReference());
      toast.error(message);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buy for one person</CardTitle>
          <CardDescription>
            Send airtime or a data bundle to one phone number. It is sent immediately, with no
            approval needed. Bulk uploads still go to a checker for approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={productType}
            onValueChange={(value) => {
              setProductType(value as ProductType);
              setError(null);
            }}
          >
            <TabsList>
              <TabsTrigger value="AIRTIME">Airtime</TabsTrigger>
              <TabsTrigger value="DATA_BUNDLE">Data bundle</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1">
            <Label htmlFor="single-phone">Phone Number</Label>
            <Input
              id="single-phone"
              inputMode="tel"
              value={phone}
              placeholder="e.g. 0772123456 or 256772123456"
              onChange={(e) => onPhoneChange(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="single-network">Network</Label>
            <Select
              value={network}
              onValueChange={(value) => {
                setNetworkPicked(true);
                changeNetwork(value as DataBundleNetwork);
              }}
            >
              <SelectTrigger id="single-network">
                <SelectValue placeholder="Detected from the number" />
              </SelectTrigger>
              <SelectContent>
                {DATA_BUNDLE_NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {networkLabel(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mismatch && (
              <p className="text-xs text-red-600">
                This number looks like {networkLabel(detected)}, not {networkLabel(network)}.
              </p>
            )}
          </div>

          {isAirtime ? (
            <div className="space-y-1">
              <Label htmlFor="single-amount">Amount (UGX)</Label>
              <Input
                id="single-amount"
                inputMode="numeric"
                value={amountText}
                placeholder={`${limits.min.toLocaleString('en-UG')} to ${limits.max.toLocaleString('en-UG')}`}
                onChange={(e) => {
                  setAmountText(e.target.value);
                  setError(null);
                }}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_AMOUNTS.filter((a) => a >= limits.min && a <= limits.max).map((a) => (
                  <Button
                    key={a}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmountText(String(a))}
                  >
                    {formatUgx(a)}
                  </Button>
                ))}
              </div>
              {amountError && <p className="text-xs text-red-600">{amountError}</p>}
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="single-bundle">Bundle</Label>
              <Select
                value={bundleCode}
                onValueChange={setBundleCode}
                disabled={!network || products.isLoading || options.length === 0}
              >
                <SelectTrigger id="single-bundle">
                  <SelectValue
                    placeholder={
                      products.isLoading
                        ? 'Loading bundles…'
                        : network
                          ? options.length
                            ? 'Choose a bundle'
                            : `No ${networkLabel(network)} bundles available`
                          : 'Choose the network first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {options.map((p) => (
                    <SelectItem key={p.bundleCode} value={p.bundleCode}>
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="single-note">Name / Note (optional)</Label>
            <Input
              id="single-note"
              value={note}
              maxLength={255}
              placeholder="e.g. Jane Doe"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {productReady && (
            <div className="rounded-lg border bg-gray-50 p-4 text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">{isAirtime ? 'Airtime' : 'Bundle'}</span>
                <span className="font-medium text-right">{purchaseText}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">{isAirtime ? 'Amount' : 'Price'}</span>
                <span className="font-medium">{formatUgx(price)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">To</span>
                <span className="font-medium">
                  {phone.trim()} {network && `(${networkLabel(network)})`}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>
            <Send className="h-4 w-4 mr-2" />
            Send now
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={(open) => !createSingle.isPending && setConfirmOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {isAirtime ? 'airtime' : 'this bundle'} now?</DialogTitle>
            <DialogDescription>
              {productReady
                ? `${purchaseText} to ${phone.trim()}. It is paid from your disbursement wallet and sent immediately, with no approval step.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={createSingle.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createSingle.isPending}>
              {createSingle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
