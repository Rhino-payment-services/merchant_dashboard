"use client";

import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '../UserProfileProvider';
import { Button } from '@/components/ui/button';
import { 
  QrCode, 
  Printer, 
  Download, 
  Copy, 
  Share2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { API_CONFIG } from '@/lib/config';
import { AccessDenied } from '@/app/components/AccessDenied';
import { useTeamPermissionSession } from '@/lib/hooks/useTeamPermissionSession';
import { canCollectPayments } from '@/lib/utils/permissions';

export default function QRCodePage() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>('');
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const { profile } = useUserProfile();
  const teamSession = useTeamPermissionSession();

  const merchantCode = profile?.merchant_code || profile?.merchantCode || (session?.user as any)?.merchantCode || "";
  const merchantName = profile?.merchant_names || profile?.merchantBusinessTradeName || profile?.businessTradeName || "Your Business";
  const baseUrl = API_CONFIG.PAYMENT_PAGE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const paymentUrl = `${baseUrl}/receive_payment/${merchantCode}`;
  const loading = status === "loading";
  const allowed = canCollectPayments(teamSession);

  // Generate QR code with logo overlay
  useEffect(() => {
    if (!allowed) {
      setQrLoading(false);
      return;
    }
    const generateQRWithLogo = async () => {
      if (!merchantCode) {
        setError('Merchant code not found. Please check your profile.');
        setQrLoading(false);
        return;
      }
      
      try {
        setQrLoading(true);
        setError('');
        
        // Generate QR code with higher error correction to allow for logo overlay
        const qrDataUrl = await QRCode.toDataURL(paymentUrl, {
          width: 400,
          margin: 2,
          errorCorrectionLevel: 'H', // High error correction allows ~30% of QR code to be covered
          color: {
            dark: '#08163d',
            light: '#FFFFFF'
          }
        });

        // Create canvas to overlay logo
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Load QR code image
        const qrImage = new Image();
        qrImage.src = qrDataUrl;
        
        await new Promise((resolve, reject) => {
          qrImage.onload = resolve;
          qrImage.onerror = reject;
        });

        // Set canvas size
        canvas.width = qrImage.width;
        canvas.height = qrImage.height;

        // Draw QR code
        ctx.drawImage(qrImage, 0, 0);

        // Load and draw logo (if available)
        try {
          const logoImage = new Image();
          logoImage.crossOrigin = 'anonymous';
          
          // Load company logo from public folder
          logoImage.src = '/images/logo.jpg';
          
          await new Promise((resolve) => {
            logoImage.onload = resolve;
            logoImage.onerror = () => resolve(null); // Continue without logo if it fails
          });

          if (logoImage.complete && logoImage.naturalWidth > 0) {
            // Calculate logo size (about 20% of QR code size)
            const logoSize = Math.floor(canvas.width * 0.2);
            const logoX = (canvas.width - logoSize) / 2;
            const logoY = (canvas.height - logoSize) / 2;

            // Draw white background circle for logo
            const bgSize = logoSize + 10;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, bgSize / 2, 0, 2 * Math.PI);
            ctx.fill();

            // Draw logo
            ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
          }
        } catch {
          // Continue without logo if it fails to load
        }

        // Convert canvas to data URL
        const finalQrUrl = canvas.toDataURL('image/png');
        setQrCodeUrl(finalQrUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
        setError('Failed to generate QR code. Please try again.');
        toast.error('Failed to generate QR code');
      } finally {
        setQrLoading(false);
      }
    };

    if (!loading && session) {
      generateQRWithLogo();
    }
  }, [merchantCode, paymentUrl, loading, session, allowed]);

  const handlePrint = async () => {
    if (!qrCodeUrl) {
      toast.error('No QR code available to print');
      return;
    }
    
    setIsLoading(true);
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${merchantName} - QR Code</title>
              <style>
                @media print {
                  @page {
                    size: A4;
                    margin: 0;
                  }
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
                  font-size: 32px;
                  font-weight: 700;
                }
                .merchant-code {
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
                  <h1>${merchantName}</h1>
                  <div class="merchant-code">Merchant Code: ${merchantCode}</div>
                </div>
                <img src="${qrCodeUrl}" alt="QR Code" />
                <div class="instructions">
                  <p class="scan-text">Scan to Pay with RukaPay</p>
                  <p>1. Open your RukaPay app or camera</p>
                  <p>2. Scan this QR code</p>
                  <p>3. Enter payment amount and confirm</p>
                </div>
                <div class="footer">
                  <p>Powered by RukaPay • Secure Payment Gateway</p>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Wait a bit for the image to load, then trigger print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
      
      toast.success('Print dialog opened');
    } catch (error) {
      console.error('Error printing QR code:', error);
      toast.error('Failed to print QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!qrCodeUrl) {
      toast.error('No QR code available to download');
      return;
    }

    setIsLoading(true);
    try {
      // Create a temporary link element to download the QR code
      const link = document.createElement('a');
      link.download = `${merchantName.replace(/\s+/g, '_')}_QR_Code.png`;
      link.href = qrCodeUrl; // Use the already generated QR code URL
      link.click();
      
      toast.success('QR code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      toast.success('Payment link copied to clipboard');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Pay ${merchantName}`,
          text: `Scan this QR code or use this link to pay ${merchantName} via RukaPay`,
          url: paymentUrl
        });
        toast.success('Shared successfully');
      } else {
        handleCopyLink();
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!allowed) {
    return (
      <AccessDenied description="You do not have permission to collect payments." />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  const actionsDisabled = isLoading || !qrCodeUrl || qrLoading || !!error;

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Your QR Code</h1>
          <p className="mt-0.5 text-[12px] text-gray-400">
            Share this QR code with customers to receive payments
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div
            ref={qrCodeRef}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-700">
                <QrCode className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <h2 className="mt-3 text-[16px] font-semibold text-gray-900">{merchantName}</h2>
              <p className="mt-1 text-[12px] text-gray-400">
                Merchant Code:{' '}
                <span className="font-medium tabular-nums text-gray-700">{merchantCode || '—'}</span>
              </p>

              {error ? (
                <div className="mt-5 flex h-64 w-64 items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-red-700">Error</p>
                    <p className="mt-1 text-[12px] text-red-600">{error}</p>
                  </div>
                </div>
              ) : qrLoading ? (
                <div className="mt-5 flex h-64 w-64 flex-col items-center justify-center rounded-2xl bg-gray-50">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
                  <p className="mt-3 text-[12px] text-gray-400">Generating QR Code...</p>
                </div>
              ) : qrCodeUrl ? (
                <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <img
                    src={qrCodeUrl}
                    alt="Merchant QR Code"
                    className="h-64 w-64"
                  />
                </div>
              ) : (
                <div className="mt-5 flex h-64 w-64 items-center justify-center rounded-2xl bg-gray-50">
                  <p className="text-[12px] text-gray-400">No QR code available</p>
                </div>
              )}

              <div className="mt-5 w-full border-t border-gray-100 pt-4">
                <p className="text-[13px] font-semibold text-gray-900">Scan to Pay</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Use RukaPay app or camera to scan</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h3 className="text-[14px] font-semibold text-gray-900">Actions</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  onClick={handlePrint}
                  disabled={actionsDisabled}
                  className="h-9 rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print QR Code
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={actionsDisabled}
                  variant="outline"
                  className="h-9 rounded-full border-gray-200 px-3 text-[12px]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download QR Code
                </Button>
                <Button
                  onClick={handleShare}
                  disabled={!qrCodeUrl || qrLoading || !!error}
                  variant="outline"
                  className="h-9 rounded-full border-gray-200 px-3 text-[12px]"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share QR Code
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h3 className="text-[14px] font-semibold text-gray-900">Payment Link</h3>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1 truncate rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-[12px] text-gray-600">
                  {paymentUrl}
                </div>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="h-9 shrink-0 rounded-full border-gray-200 px-3 text-[12px]"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h3 className="text-[14px] font-semibold text-gray-900">How to Use</h3>
              <ol className="mt-3 space-y-3">
                {[
                  'Print or display your QR code at your business location',
                  'Customers scan the code with their RukaPay app or camera',
                  'They enter the payment amount and confirm',
                  'You receive payment instantly in your wallet',
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 text-[12px] leading-snug text-gray-600">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

