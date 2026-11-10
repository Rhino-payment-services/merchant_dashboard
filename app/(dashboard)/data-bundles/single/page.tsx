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
import { AccessDenied } from '@/app/components/AccessDenied';
import { useCreateSingleBundle, useDataBundleProducts } from '@/lib/hooks/useDataBundles';
import {
  DATA_BUNDLE_NETWORKS,
  type DataBundleNetwork,
  apiErrorMessage,
  detectNetwork,
  formatUgx,
  networkLabel,
  productsByNetwork,
} from '@/lib/utils/data-bundles';
import { useDataBundleAccessContext } from '../_components/DataBundleAccessContext';

export default function BuyForOnePage() {
  const router = useRouter();
  const access = useDataBundleAccessContext();
  const products = useDataBundleProducts(access.can.upload);
  const createSingle = useCreateSingleBundle();

  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<DataBundleNetwork | ''>('');
  const [networkPicked, setNetworkPicked] = useState(false);
  const [bundleCode, setBundleCode] = useState('');
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byNetwork = useMemo(() => productsByNetwork(products.data ?? []), [products.data]);
  const options = network ? byNetwork[network] : [];
  const selected = options.find((p) => p.bundleCode === bundleCode) ?? null;
  const detected = detectNetwork(phone);
  const mismatch = !!detected && !!network && detected !== network;

  if (!access.can.upload) {
    return <AccessDenied description="You do not have permission to buy data bundles." />;
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

  const canSubmit = !!phone.trim() && !!network && !!selected && !mismatch && !createSingle.isPending;

  const submit = async () => {
    if (!selected || !network) return;
    setError(null);
    try {
      const res = await createSingle.mutateAsync({
        phoneNumber: phone.trim(),
        bundle: selected.bundleCode,
        network,
        note: note.trim() || undefined,
      });
      setConfirmOpen(false);
      router.push(`/data-bundles/batches/${res.batch.id}`);
    } catch (e) {
      const message = apiErrorMessage(e, 'Could not submit this bundle. Please try again.');
      setError(message);
      setConfirmOpen(false);
      toast.error(message);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buy a bundle for one person</CardTitle>
          <CardDescription>
            Enter the phone number and choose a bundle. It goes to a checker for approval before it is
            sent. Prices come from RukaPay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {selected && (
            <div className="rounded-lg border bg-gray-50 p-4 text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Bundle</span>
                <span className="font-medium text-right">{selected.displayName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Price</span>
                <span className="font-medium">{formatUgx(selected.price)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">To</span>
                <span className="font-medium">
                  {phone.trim()} ({networkLabel(network)})
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>
            <Send className="h-4 w-4 mr-2" />
            Submit for approval
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={(open) => !createSingle.isPending && setConfirmOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit this bundle for approval?</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.displayName} to ${phone.trim()}. A checker must approve it before it is sent.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={createSingle.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createSingle.isPending}>
              {createSingle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
