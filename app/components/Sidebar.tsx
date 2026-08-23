"use client"

import React, { useState, useEffect } from 'react';
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
  Building2,
  Calendar,
  Droplets
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';
import { checkMerchantIsSuperMerchant } from '@/lib/api/super-merchant.api';
import {
  canViewTransactions,
  canCollectPayments,
  canInitiatePayments,
  canLiquidate as canLiquidatePermission,
  canViewReports,
  canManageTeam,
  canManagePayroll,
  canApprovePayments,
  canManageEvents,
  canManageSettings,
  type UserSession,
} from '@/lib/utils/permissions';

const navLinks = [
  { section: 'GENERAL', links: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: CreditCard },
    { name: 'Request Payment', path: '/top-up', icon: ArrowDown },
    { name: 'QR Code', path: '/qr-code', icon: QrCode },
    { name: 'Payment', path: '/bulk-payment', icon: ArrowRightLeft },
    { name: 'Events', path: '/events', icon: Calendar },
    { name: 'Liquidate', path: '/liquidate', icon: Droplets },
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

  // Sidebar always shows the logged-in user's own merchant — never the child being viewed
  const ownMerchant =
    merchants.find((m: any) => m.isSuperMerchant === true) || merchants[0];

  const currentMerchant = ownMerchant;

  const businessName =
    ownMerchant?.businessTradeName ||
    (ownMerchant?.merchantCode ? `Business · ${ownMerchant.merchantCode}` : null);

  const displayMerchantCode = ownMerchant?.merchantCode;
  
  // Feature flags from the user's own session merchant (not child context)
  const liveMerchant =
    (profile as any)?.merchantData ||
    (profile as any)?.businessWallet?.merchant ||
    currentMerchant;
  const featureBulkPayments =
    (liveMerchant?.featureBulkPayments ?? currentMerchant?.featureBulkPayments) === true;
  const featureLiquidation =
    (liveMerchant?.featureLiquidation ?? (currentMerchant as any)?.featureLiquidation) === true;
  const featurePayroll =
    (liveMerchant?.featurePayroll ?? currentMerchant?.featurePayroll) === true;
  const featurePayrollApprovals =
    (liveMerchant?.featurePayrollApprovals ?? currentMerchant?.featurePayrollApprovals) === true;
  const liquidationOnlyMode =
    (liveMerchant?.liquidationOnlyMode ?? (currentMerchant as any)?.liquidationOnlyMode) === true;

  // Liquidate + payroll: require featureLiquidation or featureBulkPayments (Payment link is always shown).
  // Liquidation-Only Mode forces Liquidate visible and hides Payment/Payroll.
  const merchantCanLiquidate =
    liquidationOnlyMode || featureLiquidation || featureBulkPayments;

  const userSession: UserSession = {
    role: (profile as any)?.role,
    isWalletOwner: !!(profile as any)?.isWalletOwner,
    userData: (profile as any)?.walletPermissions,
  };

  // State for super merchant status
  const [isSuperMerchant, setIsSuperMerchant] = useState(false);
  
  // Check super merchant status - similar to home page logic
  useEffect(() => {
    const checkSuperMerchantStatus = async () => {
      // First, check if session merchants array has isSuperMerchant field (fastest check)
      if (currentMerchant && typeof currentMerchant.isSuperMerchant === 'boolean') {
        console.log('✅ Sidebar: Using isSuperMerchant from session merchant data:', currentMerchant.isSuperMerchant);
        setIsSuperMerchant(currentMerchant.isSuperMerchant);
        return;
      }
      
      // Fallback: check if any merchant in the session is a super merchant
      const anySuperMerchant = merchants.some((m: any) => m.isSuperMerchant === true);
      if (anySuperMerchant) {
        console.log('✅ Sidebar: Found super merchant in merchants array');
        setIsSuperMerchant(true);
        return;
      }
      
      // Final fallback: Check via API using current merchant ID
      const currentMerchantId = currentMerchant?.id || profile?.merchantId;
      if (currentMerchantId) {
        try {
          console.log('🔍 Sidebar: Checking super merchant status via API for merchantId:', currentMerchantId);
          const result = await checkMerchantIsSuperMerchant(currentMerchantId);
          console.log('🔍 Sidebar: Super merchant check result:', result);
          setIsSuperMerchant(result);
        } catch (err: any) {
          console.error('❌ Sidebar: Error checking super merchant status:', err);
          setIsSuperMerchant(false);
        }
      } else {
        console.warn('⚠️ Sidebar: No merchant ID available for super merchant check');
        setIsSuperMerchant(false);
      }
    };
    
    if (session && merchants.length > 0) {
      checkSuperMerchantStatus();
    }
  }, [session, currentMerchant, merchants, profile?.merchantId]);
  
  // Filter navLinks based on feature flags + team member permissions
  const filteredNavLinks = navLinks.map(section => ({
    ...section,
    links: section.links.filter(link => {
      if (liquidationOnlyMode) {
        if (link.path === '/bulk-payment') return false;
        if (link.path === '/payroll') return false;
        if (link.path === '/payroll/approvals') return false;
        if (link.path === '/liquidate') {
          return merchantCanLiquidate && canLiquidatePermission(userSession);
        }
        // still apply team perms for other items
      }
      if (link.path === '/transactions') return canViewTransactions(userSession);
      if (link.path === '/top-up' || link.path === '/qr-code') {
        return canCollectPayments(userSession);
      }
      if (link.path === '/bulk-payment') {
        return !liquidationOnlyMode && canInitiatePayments(userSession);
      }
      if (link.path === '/events') return canManageEvents(userSession);
      if (link.path === '/liquidate') {
        return merchantCanLiquidate && canLiquidatePermission(userSession);
      }
      if (link.path === '/reports') return canViewReports(userSession);
      if (link.path === '/team') return canManageTeam(userSession);
      if (link.path === '/payroll') {
        return (
          featurePayroll &&
          merchantCanLiquidate &&
          canManagePayroll(userSession)
        );
      }
      if (link.path === '/payroll/approvals') {
        return (
          featurePayrollApprovals &&
          merchantCanLiquidate &&
          canApprovePayments(userSession)
        );
      }
      if (link.path === '/kyc' || link.path === '/settings') {
        return canManageSettings(userSession);
      }
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
        fixed md:static top-0 left-0 h-screen md:h-auto md:self-stretch w-64 shrink-0 bg-white z-50 md:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col overflow-hidden p-6 border-r border-gray-200
      `}>
        {/* Mobile Close Button */}
        <div className="md:hidden flex-shrink-0 flex justify-end mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="cursor-pointer text-gray-600 hover:text-gray-900"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Logo */}
        <div className="flex-shrink-0 mb-4 flex items-center gap-3">
          <Image src="/images/logo.jpg" alt="RukaPay" width={48} height={48} className='rounded-lg shadow-sm' />
          <span className="text-2xl font-bold text-[#08163d]">RukaPay</span>
        </div>
        {/* Current business / merchant name */}
        {businessName && (
          <div className="flex-shrink-0 mb-6 px-3 py-2.5 rounded-lg bg-main-50 border border-main-100">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-main-600 flex-shrink-0" />
              <p className="text-xs font-medium text-main-600 uppercase tracking-wide">Current business</p>
            </div>
            <p className="text-sm font-semibold text-[#08163d] truncate" title={businessName}>
              {businessName}
            </p>
            {displayMerchantCode && (
              <p className="text-xs text-main-600 mt-1">{displayMerchantCode}</p>
            )}
          </div>
        )}

        {/* Navigation — scrolls when viewport is short */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-6 -mr-2 pr-2">
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
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
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
        <div className="flex-shrink-0 mt-4 pt-6 border-t border-gray-200">
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
              <div className="text-sm font-medium text-gray-900 truncate" title={businessName || 'Business'}>
                {businessName || 'Business'}
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
