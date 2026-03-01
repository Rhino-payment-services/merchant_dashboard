"use client"

import React from 'react';
import { Button } from '../../components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowRightLeft, 
  BarChart3, 
  FileText, 
  Package, 
  FileBarChart, 
  Settings, 
  HelpCircle, 
  MessageCircle,
  ArrowDown,
  X,
  QrCode,
  Search,
  Users,
  Briefcase,
  CheckCircle,
  FileCheck,
  ShieldCheck,
  Building2
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';

const navLinks = [
  { section: 'GENERAL', links: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transaction', path: '/transactions', icon: CreditCard },
    // { name: 'Withdraw', path: '/transfer', icon: ArrowRightLeft },
    { name: 'Request Payment', path: '/top-up', icon: ArrowDown },
    { name: 'QR Code', path: '/qr-code', icon: QrCode },
    // { name: 'Save', path: '/save', icon: BarChart3 },
    // { name: 'Employees', path: '/employees', icon: Package },
    // { name: 'Payroll', path: '/payroll', icon: FileText },
    { name: 'Payment', path: '/bulk-payment', icon: ArrowRightLeft },
  ]},
  { section: 'TOOLS', links: [
    { name: 'Report', path: '/reports', icon: FileBarChart },
    { name: 'Team Members', path: '/team', icon: Users },
    { name: 'Payroll', path: '/payroll', icon: Briefcase },
    { name: 'Payroll Approvals', path: '/payroll/approvals', icon: CheckCircle },
  ]},
  { section: 'ACCOUNT', links: [
    { name: 'KYC Verification', path: '/kyc', icon: ShieldCheck },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]},
  // { section: 'SUPPORT', links: [
  //   { name: 'Help Center', path: '/help', icon: HelpCircle },
  //   { name: 'Feedback', path: '/feedback', icon: MessageCircle },
  // ]},
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname:any = usePathname();
  // const  {data: session} = useSession()
  const { data: session } = useSession();
  const { profile } = useUserProfile();
  const merchants = (session?.user as any)?.merchants || [];
  const currentMerchantCode = (session?.user as any)?.merchantCode;
  const profileMerchantCode = profile?.merchant_code || profile?.merchantCode;
  const effectiveMerchantCode = currentMerchantCode || profileMerchantCode;
  
  // Improved merchant matching (handles padding and string comparison like home page)
  const currentMerchant = effectiveMerchantCode 
    ? merchants.find((m: any) => {
        const mCode = String(m?.merchantCode || '').trim();
        const eCode = String(effectiveMerchantCode || '').trim();
        return mCode === eCode || mCode === eCode.padStart(4, '0') || eCode === mCode.padStart(4, '0');
      })
    : merchants[0];
  
  const businessName = profile?.merchant_names || profile?.businessTradeName || currentMerchant?.businessTradeName 
    || ((effectiveMerchantCode) ? `Business · ${effectiveMerchantCode}` : null);
  
  // Feature flags — prefer live wallet data (profile.merchantData) so admin changes
  // take effect without requiring the merchant to re-login.
  const liveMerchantData = profile?.merchantData || profile?.businessWallet?.merchant;
  const featurePayroll =
    (liveMerchantData?.featurePayroll ?? currentMerchant?.featurePayroll) === true;
  const featurePayrollApprovals =
    (liveMerchantData?.featurePayrollApprovals ?? currentMerchant?.featurePayrollApprovals) === true;
  
  // Filter navLinks: Payroll and Payroll Approvals only when enabled for this merchant.
  // Payment (bulk/single) is available to all merchants.
  const filteredNavLinks = navLinks.map(section => ({
    ...section,
    links: section.links.filter(link => {
      if (link.path === '/payroll') return featurePayroll;
      if (link.path === '/payroll/approvals') return featurePayrollApprovals;
      return true;
    })
  })).filter(section => section.links.length > 0); // Remove empty sections
  
  const handleNavigation = (path: string) => {
    router.push(path);
    // Close mobile sidebar after navigation
    if (onClose) {
      onClose();
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' ? true : pathname === null ? false : undefined;
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed md:static top-0 left-0 h-full w-64 bg-white z-50 md:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col p-6 border-r border-gray-200
      `}>
        {/* Mobile Close Button */}
        <div className="md:hidden flex justify-end mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Logo */}
        <div className="mb-4 flex items-center gap-3">
          <Image src="/images/logo.jpg" alt="RukaPay" width={48} height={48} className='rounded-lg shadow-sm' />
          <span className="text-2xl font-bold text-[#08163d]">RukaPay</span>
        </div>
        {/* Current business / merchant name */}
        {businessName && (
          <div className="mb-6 px-3 py-2.5 rounded-lg bg-main-50 border border-main-100">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-main-600 flex-shrink-0" />
              <p className="text-xs font-medium text-main-600 uppercase tracking-wide">Current business</p>
            </div>
            <p className="text-sm font-semibold text-[#08163d] truncate" title={businessName}>
              {businessName}
            </p>
            {effectiveMerchantCode && (
              <p className="text-xs text-main-600 mt-1">{effectiveMerchantCode}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-6">
          {filteredNavLinks.map((section) => (
            <div key={section.section}>
              <div className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">{section.section}</div>
              <ul className="space-y-1">
                {section.links.map((link) => {
                  const IconComponent = link.icon;
                  const active = isActive(link.path);
                  
                  return (
                    <li key={link.name}>
                      <button
                        onClick={() => handleNavigation(link.path)}
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                          active 
                            ? 'bg-main-50 text-main-600 border border-main-200 shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 mr-3 flex-shrink-0 ${active ? 'text-main-600' : 'text-gray-500'}`} />
                        <span className="truncate">{link.name}</span>
                        {active && (
                          <div className="ml-auto w-2 h-2 bg-main-600 rounded-full flex-shrink-0"></div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* User Profile Section */}
        <div className="mt-auto pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-main-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold uppercase">
                {(() => {
                  const ownerName = profile?.owner_name || '';
                  const firstInitial = ownerName?.split(" ")[0]?.[0] || 'U';
                  const secondInitial = ownerName?.split(" ")[1]?.[0] || ownerName?.split(" ")[0]?.[1] || '';
                  return `${firstInitial}${secondInitial}`.toUpperCase() || 'U';
                })()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate" title={profile?.merchant_names || profile?.businessTradeName || 'Business'}>
                {profile?.merchant_names || profile?.businessTradeName || 'Business'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {profile?.owner_name ? `Signed in as ${profile.owner_name}` : 'Merchant'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
