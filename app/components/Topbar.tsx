"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useSidebar } from '@/app/lib/SidebarContext';

export default function Topbar() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-bg-input bg-bg-card px-4 z-50">
      <div className="flex items-center gap-4">
        {/* Hamburger Menu */}
        <button
          onClick={toggleSidebar}
          className="rounded p-2 text-text-muted hover:bg-bg-input hover:text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Toggle Navigation"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo and Title */}
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="BlueOps Logo" width={32} height={32} className="rounded" />
          <span className="hidden sm:block text-xl font-bold tracking-tight text-text-main">
            BlueOps
          </span>
        </Link>
      </div>

      {/* Right-side Action Icons */}
      <div className="flex items-center gap-2">
        <button className="rounded p-2 text-text-muted hover:bg-bg-input hover:text-text-main" aria-label="Notifications">
          <span className="text-xl">🔔</span>
        </button>
        <Link href="/settings" className="rounded p-2 text-text-muted hover:bg-bg-input hover:text-text-main" aria-label="Settings">
          <span className="text-xl">⚙️</span>
        </Link>
        <button className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white" aria-label="Profile">
          BO
        </button>
      </div>
    </header>
  );
}
