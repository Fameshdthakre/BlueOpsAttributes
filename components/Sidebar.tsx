"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const navItems = [
  { name: 'Input', href: '/input', icon: '📂' },
  { name: 'Process', href: '/process', icon: '▶️' },
  { name: 'History', href: '/history', icon: '🕒' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen bg-bg-card border-r border-bg-input flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-bg-input">
        <Image src="/logo.png" alt="BlueOps Logo" width={32} height={32} className="rounded" />
        <h1 className="text-xl font-bold text-text-main tracking-tight">BlueOps</h1>
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
      
      <div className="p-4 border-t border-bg-input flex flex-col items-center justify-center gap-1">
        <div className="text-xs text-text-muted text-center">
          BlueOps v2.0 &bull; Vercel Edition
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
  );
}
