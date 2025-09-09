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
  MessageCircle 
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';

const navLinks = [
  { section: 'GENERAL', links: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transaction', path: '/transactions', icon: CreditCard },
    { name: 'Withdraw', path: '/transfer', icon: ArrowRightLeft },
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

export default function Sidebar() {
  const router = useRouter();
  const pathname:any = usePathname();
  // const  {data: session} = useSession()
  const  {profile} = useUserProfile()
  console.log("profile========>", profile)
  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' ? true : pathname === null ? false : undefined;
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white min-h-screen p-6 border-r border-gray-200">
      <div className="mb-8 flex items-center gap-2">
        <Image src="/images/merchantIcon.png" alt="RukaPay" width={60} height={60} className='rounded-xl' />
        <span className="text-2xl font-bold text-[#08163d]">RukaPay</span>
      </div>
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
  );
} 