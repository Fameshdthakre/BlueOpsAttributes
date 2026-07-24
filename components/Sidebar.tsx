"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useApp } from '@/lib/AppContext';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Input', href: '/input', icon: '📂' },
  { name: 'Process', href: '/process', icon: '▶️' },
  { name: 'History', href: '/history', icon: '🕒' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  // Close sidebar on navigation on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);
  
  const { running, paused, jobs, processedCount, limit } = useApp();
  const targetLimit = limit > 0 ? limit : jobs.length;
  const progressPercent = targetLimit > 0 ? Math.round((processedCount / targetLimit) * 100) : 0;
  
  // Show progress indicator if jobs exist and we are actively processing or just finished
  const showProgress = jobs.length > 0 && (running || paused || processedCount > 0);

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-bg-card border-b border-bg-input flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="BlueOps Logo" width={24} height={24} className="rounded" />
          <span className="font-bold text-text-main tracking-tight">BlueOps</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-text-muted hover:text-text-main p-2"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Actual Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 h-[100dvh] bg-bg-card border-r border-bg-input flex flex-col transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-6 flex justify-between items-center border-b border-bg-input">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="BlueOps Logo" width={32} height={32} className="rounded" />
            <h1 className="text-xl font-bold text-text-main tracking-tight">BlueOps</h1>
          </div>
          <button className="md:hidden text-text-muted" onClick={() => setIsOpen(false)}>✕</button>
        </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-text-muted hover:bg-bg-input hover:text-text-main'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      {showProgress && (
        <div className="px-4 py-2 mx-4 mb-4 bg-bg-dark rounded-lg border border-bg-input">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {running ? "Processing" : paused ? "Paused" : "Completed"}
            </span>
            <span className="text-xs font-bold text-accent">{progressPercent}%</span>
          </div>
          <div className="w-full bg-surface-2 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${running ? "bg-accent animate-pulse" : paused ? "bg-status-warning" : "bg-status-success"}`} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>
      )}
      
      <div className="px-4 pb-4">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname.startsWith('/settings') 
              ? 'bg-primary text-white shadow-lg shadow-primary/20' 
              : 'text-text-muted hover:bg-bg-input hover:text-text-main'
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span className="font-medium">Settings</span>
        </Link>
      </div>
      
      <div className="p-4 border-t border-bg-input flex flex-col items-center justify-center gap-1">
        <div className="text-xs text-text-muted text-center">
          BlueOps v1.0
        </div>
        <div className="text-[10px] text-text-muted">
          Created by{" "}
          <a 
            href="https://www.linkedin.com/in/famesh-thakre-6a2825118" 
            target="_blank" 
            rel="noreferrer"
            className="text-accent hover:underline cursor-pointer"
          >
            Famesh Thakre
          </a>
        </div>
      </div>
    </div>
    </>
  );
}
