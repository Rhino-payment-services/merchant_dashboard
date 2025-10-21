"use client";

import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

export default function QRCodePage() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>('');
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();

  const merchantCode = (session?.user as any)?.merchantCode || "";
  const merchantName = (session?.user as any)?.name || (session?.user as any)?.userData?.profile?.firstName + " " + (session?.user as any)?.userData?.profile?.lastName || "Your Business";
  const baseUrl = API_CONFIG.PAYMENT_PAGE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const paymentUrl = `${baseUrl}/receive_payment/${merchantCode}`;
  const loading = status === "loading";

  // Debug logging
  console.log('QR Code Debug:', {
    session,
    merchantCode,
    merchantName,
    paymentUrl,
    API_CONFIG: API_CONFIG
  });

  // Generate QR code with logo overlay
  useEffect(() => {
    const generateQRWithLogo = async () => {
      console.log('Generating QR code with:', { merchantCode, paymentUrl });
      
      if (!merchantCode) {
        console.log('No merchant code available');
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
        } catch (logoError) {
          console.log('Logo not loaded, continuing without logo:', logoError);
          // Continue without logo if it fails to load
        }

        // Convert canvas to data URL
        const finalQrUrl = canvas.toDataURL('image/png');
        console.log('QR code generated successfully with logo');
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
  }, [merchantCode, paymentUrl, loading, session]);

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

    console.log("start loading=====>")
    
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08163d]"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#08163d] mb-2">Your QR Code</h1>
          <p className="text-gray-600">Share this QR code with customers to receive payments</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code Display */}
          <Card className="p-8">
            <div ref={qrCodeRef} className="bg-white p-8 rounded-lg">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <QrCode className="h-8 w-8 text-[#08163d]" />
                </div>
                <h2 className="font-bold text-2xl text-[#08163d]">{merchantName}</h2>
                <p className="text-sm text-gray-600">Merchant Code: <span className="font-semibold">{merchantCode}</span></p>
                
                {error ? (
                  <div className="flex justify-center my-6">
                    <div className="w-64 h-64 bg-red-50 border-2 border-red-200 rounded-xl flex flex-col items-center justify-center p-4">
                      <div className="text-red-600 text-center">
                        <p className="font-semibold mb-2">Error</p>
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                  </div>
                ) : qrLoading ? (
                  <div className="flex justify-center my-6">
                    <div className="w-64 h-64 bg-gray-100 rounded-xl flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08163d] mb-4"></div>
                      <p className="text-gray-600 text-sm">Generating QR Code...</p>
                    </div>
                  </div>
                ) : qrCodeUrl ? (
                  <div className="flex justify-center my-6">
                    <div className="p-4 bg-white border-4 border-[#08163d] rounded-xl shadow-lg">
                      <img 
                        src={qrCodeUrl} 
                        alt="Merchant QR Code" 
                        className="w-64 h-64"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center my-6">
                    <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                      <p className="text-gray-500">No QR code available</p>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold text-[#08163d] mb-2">Scan to Pay</p>
                  <p className="text-xs text-gray-500">Use RukaPay app or camera to scan</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions and Information */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg text-[#08163d] mb-4">Actions</h3>
              <div className="space-y-3">
                <Button 
                  onClick={handlePrint}
                  disabled={isLoading || !qrCodeUrl || qrLoading || !!error}
                  className="w-full bg-[#08163d] hover:bg-[#0a1a4a] text-white flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print QR Code
                </Button>
                
                <Button 
                  onClick={handleDownload}
                  disabled={isLoading || !qrCodeUrl || qrLoading || !!error}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </Button>
                
                <Button 
                  onClick={handleShare}
                  disabled={!qrCodeUrl || qrLoading || !!error}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share QR Code
                </Button>
              </div>
            </Card>

            {/* Payment Link */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg text-[#08163d] mb-4">Payment Link</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg break-all text-sm text-gray-700">
                  {paymentUrl}
                </div>
                <Button 
                  onClick={handleCopyLink}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Instructions */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-lg text-[#08163d] mb-3">How to Use</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-[#08163d] min-w-[20px]">1.</span>
                  <span>Print or display your QR code at your business location</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-[#08163d] min-w-[20px]">2.</span>
                  <span>Customers scan the code with their RukaPay app or camera</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-[#08163d] min-w-[20px]">3.</span>
                  <span>They enter the payment amount and confirm</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-[#08163d] min-w-[20px]">4.</span>
                  <span>You receive payment instantly in your wallet</span>
                </li>
              </ol>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

