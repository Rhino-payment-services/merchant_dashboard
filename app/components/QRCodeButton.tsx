"use client"

import React, { useRef, useState } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { useMerchantAuth } from "@/lib/context/MerchantAuthContext";
import { useUserProfile } from '../(dashboard)/UserProfileProvider';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  QrCode, 
  Share2, 
  Printer, 
  Download, 
  Copy, 
  MoreVertical,
  Smartphone,
  MessageSquare
} from 'lucide-react';

interface QRCodeButtonProps {
  merchantCode: string;
  merchantName: string;
  variant?: "default" | "compact";
}

export default function QRCodeButton({ merchantCode, merchantName, variant = "default" }: QRCodeButtonProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const { user } = useMerchantAuth();
  const merchantCodeValue2 = user?.merchantCode || "";

  // Generate QR code when component mounts
  React.useEffect(() => {
    const generateQR = async () => {
      try {
        const merchantCodeValue = user?.merchantCode || "";
        const qrData = `http://10.10.10.26:7220/receive_payment/${merchantCodeValue}`;
        const qrUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQR();
  }, [user?.merchantCode]);

  const handlePrint = async () => {
    if (!qrCodeRef.current) return;
    
    setIsLoading(true);
    try {
      const canvas = await html2canvas(qrCodeRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${merchantName} - QR Code</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: Arial, sans-serif;
                  text-align: center;
                  background-color: #ffffff;
                }
                .qr-container {
                  display: inline-block;
                  padding: 20px;
                  border: 1px solid #d1d5db;
                  border-radius: 8px;
                  background-color: #ffffff;
                }
                .merchant-info {
                  margin-bottom: 20px;
                }
                .merchant-name {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  color: #111827;
                }
                .merchant-code {
                  font-size: 16px;
                  color: #6b7280;
                  margin-bottom: 20px;
                }
                .qr-code {
                  margin: 0 auto;
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <div class="merchant-info">
                  <div class="merchant-name">${merchantName}</div>
                  <div class="merchant-code">Merchant Code: ${merchantCodeValue2}</div>
                </div>
                <img src="${canvas.toDataURL()}" alt="QR Code" class="qr-code" />
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error printing QR code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsImage = async () => {
    if (!qrCodeRef.current) return;
    
    setIsLoading(true);
    try {
      // Create a temporary div with standard CSS colors for html2canvas
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '24px';
      tempDiv.style.borderRadius = '8px';
      tempDiv.style.border = '1px solid #e5e7eb';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.textAlign = 'center';
      tempDiv.style.color = '#111827';
      
      tempDiv.innerHTML = `
        <div style="margin-bottom: 12px; font-size: 18px; font-weight: bold; color: #111827;">
          ${merchantName}
        </div>
        <div style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">
          Merchant Code: ${merchantCodeValue2}
        </div>
        <div style="display: flex; justify-content: center;">
          <img src="${qrCodeUrl}" alt="QR Code" style="width: 192px; height: 192px; border: 1px solid #d1d5db; border-radius: 8px;" />
        </div>
      `;
      
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      
      // Clean up temporary div
      document.body.removeChild(tempDiv);
      
      const link = document.createElement('a');
      link.download = `${merchantName}-qr-code.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error saving QR code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const merchantId = user?.merchantCode || "";
        const merchantLink = `http://10.10.10.26:7220/receive_payment/${merchantId}`;
        await navigator.share({
          title: `${merchantName} - QR Code`,
          text: ` Scan this QR code to pay ${merchantName}`,
          url: merchantLink
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyToClipboard();
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const merchantId = user?.merchantCode || "";
      const merchantLink = `http://10.10.10.26:7220/receive_payment/${merchantId}`;
      await navigator.clipboard.writeText(merchantLink);
      // You could add a toast notification here
      alert('Merchant link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleShareViaWhatsApp = () => {
    const text = encodeURIComponent(`Scan this QR code to pay ${merchantName}: http://10.10.10.26:7220/receive_payment/?merchant_code=${user?.merchantCode || ""}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareViaSMS = () => {
    const text = encodeURIComponent(`Scan this QR code to pay ${merchantName}: http://10.10.10.26:7220/receive_payment/?merchant_code=${user?.merchantCode || merchantCode || ""}`);
    window.open(`sms:?body=${text}`, '_blank');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {variant === "compact" ? (
          <Button variant="ghost" size="icon" className="relative">
            <QrCode className="h-5 w-5" />
            <span className="sr-only">Show QR Code</span>
          </Button>
        ) : (
          <Button variant="outline" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Show QR Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Merchant QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4">
          {/* QR Code Display */}
          <Card ref={qrCodeRef} className="p-6 bg-white">
            <div className="text-center space-y-3">
              <div className="font-semibold text-lg">{merchantName}</div>
              <div className="text-sm text-gray-600">Merchant Code: {merchantCodeValue2}</div>
              {qrCodeUrl && (
                <div className="flex justify-center">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-48 h-48 border border-gray-200 rounded-lg"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button 
              onClick={handleShare}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            
            <Button 
              onClick={handlePrint}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            
            <Button 
              onClick={handleSaveAsImage}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <Download className="h-4 w-4" />
              Save
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <MoreVertical className="h-4 w-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyToClipboard}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareViaWhatsApp}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Share via WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareViaSMS}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Share via SMS
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isLoading && (
            <div className="text-sm text-gray-500">
              Processing...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 