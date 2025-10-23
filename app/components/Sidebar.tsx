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
  Search
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';

const navLinks = [
  { section: 'GENERAL', links: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transaction', path: '/transactions', icon: CreditCard },
    { name: 'Tracking (Bulk)', path: '/transaction-tracking', icon: BarChart3 },
    // { name: 'Withdraw', path: '/transfer', icon: ArrowRightLeft },
    { name: 'Top Up', path: '/top-up', icon: ArrowDown },
    { name: 'QR Code', path: '/qr-code', icon: QrCode },
    // { name: 'Save', path: '/save', icon: BarChart3 },
    // { name: 'Employees', path: '/employees', icon: Package },
    // { name: 'Payroll', path: '/payroll', icon: FileText },
    { name: 'Bulk Payment', path: '/bulk-payment', icon: ArrowRightLeft },
  ]},
  { section: 'TOOLS', links: [
    { name: 'Report', path: '/reports', icon: FileBarChart },
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
  const  {profile} = useUserProfile()
  console.log("profile========>", profile)
  
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
        fixed md:static top-0 left-0 h-full w-56 bg-white z-50 md:z-auto
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
        <div className="mb-8 flex items-center gap-3">
          <Image src="/images/logo.jpg" alt="RukaPay" width={48} height={48} className='rounded-lg shadow-sm' />
          <span className="text-2xl font-bold text-[#08163d]">RukaPay</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6">
          {navLinks.map((section) => (
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
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active 
                            ? 'bg-main-50 text-main-600 border border-main-200 shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 mr-3 ${active ? 'text-main-600' : 'text-gray-500'}`} />
                        {link.name}
                        {active && (
                          <div className="ml-auto w-2 h-2 bg-main-600 rounded-full"></div>
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
            <div className="w-8 h-8 rounded-full bg-main-600 flex items-center justify-center">
              <span className="text-white text-sm font-semibold uppercase">{profile?.profile?.merchant_names?.charAt(0)} {profile?.profile?.merchant_names?.split(" ")[1]?.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{profile?.profile?.merchant_names}</div>
              <div className="text-xs text-gray-500">Merchant</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
