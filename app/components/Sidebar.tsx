"use client"

import React from 'react';
import { Button } from '../../components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowRightLeft, 
  FileBarChart, 
  Settings, 
  ArrowDown,
  X,
  QrCode,
  Users,
  Briefcase,
  CheckCircle,
  ShieldCheck,
  Building2,
  Calendar,
  Droplets,
  Wifi
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';
import { isSessionMerchantOwnAccount } from '@/lib/auth/sessionPayload';
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
  buildUserPermissionSession,
} from '@/lib/utils/permissions';
import { isDataBundlesAvailable, readDataBundleFeature } from '@/lib/utils/data-bundles';

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
    { name: 'Airtime & Bundles', path: '/data-bundles', icon: Wifi },
  ]},
  { section: 'ACCOUNT', links: [
    { name: 'KYC Verification', path: '/kyc', icon: ShieldCheck },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]},
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { profile } = useUserProfile();
  const merchants = (session?.user as any)?.merchants || [];
  const sessionMerchantCode = (session?.user as any)?.merchantCode;

  // Sidebar shows the merchant currently selected in session (own or team invite).
  const codeMatch = (m: any) =>
    String(m?.merchantCode || '').trim() === String(sessionMerchantCode || '').trim();

  const currentMerchant =
    merchants.find((m: any) => codeMatch(m)) ||
    merchants.find((m: any) => isSessionMerchantOwnAccount(m) && m.isSuperMerchant === true) ||
    merchants.find((m: any) => isSessionMerchantOwnAccount(m)) ||
    merchants[0];

  const businessName =
    currentMerchant?.businessTradeName ||
    (currentMerchant?.merchantCode ? `Business · ${currentMerchant.merchantCode}` : null);

  const displayMerchantCode = currentMerchant?.merchantCode;
  
  // Feature flags from the currently selected merchant (own or team)
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
  const featureDataBundleDistribution = readDataBundleFeature(liveMerchant, currentMerchant);

  // Liquidate + payroll: require featureLiquidation or featureBulkPayments (Payment link is always shown).
  // Liquidation-Only Mode forces Liquidate visible and hides Payment/Payroll.
  const merchantCanLiquidate =
    liquidationOnlyMode || featureLiquidation || featureBulkPayments;

  const userSession = buildUserPermissionSession({
    profile: profile as Parameters<typeof buildUserPermissionSession>[0]['profile'],
    viewingChildMerchantId:
      (session?.user as { viewingChildMerchantId?: string | null })?.viewingChildMerchantId ??
      null,
  });

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
      if (link.path === '/data-bundles') {
        return isDataBundlesAvailable({
          featureDataBundleDistribution,
          liquidationOnlyMode,
          userSession,
        });
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
      return pathname === '/';
    }
    return pathname?.startsWith(path) ?? false;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed md:static top-0 left-0 h-screen md:h-full md:max-h-full min-h-0 w-56 shrink-0 bg-white z-50 md:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col overflow-hidden px-4 py-5 border-r border-gray-100
      `}>
        {/* Mobile Close Button */}
        <div className="md:hidden flex-shrink-0 flex justify-end mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="cursor-pointer h-8 w-8 text-gray-500 hover:text-gray-900"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Logo */}
        <div className="flex-shrink-0 mb-5 flex items-center gap-2 px-1">
          <Image
            src="/images/logo.jpg"
            alt="RukaPay"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="text-[15px] font-semibold tracking-tight text-[#08163d]">
            RukaPay
          </span>
        </div>

        {/* Current business — compact */}
        {businessName && (
          <div className="flex-shrink-0 mb-5 mx-0.5 px-2.5 py-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">
                Business
              </p>
            </div>
            <p className="text-[12px] font-medium text-gray-900 truncate leading-snug" title={businessName}>
              {businessName}
            </p>
            {displayMerchantCode && (
              <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">{displayMerchantCode}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain -mr-1 pr-1">
          {filteredNavLinks.map((section, sectionIndex) => (
            <div key={section.section}>
              {sectionIndex > 0 && (
                <div className="mx-1 my-3 border-t border-gray-100" />
              )}
              <div className="px-2.5 mb-1.5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
                  {section.section}
                </span>
              </div>
              <ul className="space-y-1.5">
                {section.links.map((link) => {
                  const IconComponent = link.icon;
                  const active = isActive(link.path);
                  
                  return (
                    <li key={link.name}>
                      <button
                        onClick={() => handleNavigation(link.path)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                          active 
                            ? 'bg-gray-100 text-gray-950 font-semibold' 
                            : 'text-gray-500 font-medium hover:bg-gray-50 hover:text-gray-800'
                        }`}
                      >
                        <IconComponent
                          className={`w-[15px] h-[15px] flex-shrink-0 ${
                            active ? 'text-gray-950' : 'text-gray-400'
                          }`}
                          strokeWidth={active ? 2 : 1.75}
                        />
                        <span className="truncate leading-none">{link.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* User Profile Section */}
        <div className="flex-shrink-0 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-1.5 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-semibold uppercase tracking-wide">
                {(() => {
                  const ownerName = profile?.owner_name || '';
                  const firstInitial = ownerName?.split(" ")[0]?.[0] || 'U';
                  const secondInitial = ownerName?.split(" ")[1]?.[0] || ownerName?.split(" ")[0]?.[1] || '';
                  return `${firstInitial}${secondInitial}`.toUpperCase() || 'U';
                })()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-gray-900 truncate" title={businessName || 'Business'}>
                {businessName || 'Business'}
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {profile?.owner_name ? profile.owner_name : 'Merchant'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
