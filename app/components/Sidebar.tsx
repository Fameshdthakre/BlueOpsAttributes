"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/app/lib/AppContext';
import { useTour } from '@/app/components/TourProvider';
import { useSidebar } from '@/app/lib/SidebarContext';
import { useEffect } from 'react';

const navItems = [
  { name: 'Input', href: '/input', icon: '📂' },
  { name: 'Process', href: '/process', icon: '▶️' },
  { name: 'History', href: '/history', icon: '🕒' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { startTour } = useTour();
  const { isExpanded, setExpanded } = useSidebar();
  
  // Auto-collapse sidebar on mobile after navigation
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setExpanded(false);
      }
    };
    // Initialize on mount
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setExpanded]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setExpanded(false);
    }
  }, [pathname, setExpanded]);
  
  const { running, paused, totalJobsCount, processedCount, limit } = useApp();
  const targetLimit = limit > 0 ? limit : totalJobsCount;
  const progressPercent = targetLimit > 0 ? Math.round((processedCount / targetLimit) * 100) : 0;
  
  // Show progress indicator if jobs exist and we are actively processing or just finished
  const showProgress = totalJobsCount > 0 && (running || paused || processedCount > 0);

  return (
    <>
      {/* Mobile Overlay */}
      {isExpanded && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Actual Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 h-full bg-bg-card border-r border-bg-input flex flex-col transition-all duration-300 ease-in-out
        ${isExpanded ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"}
      `}>
      
      <nav className="flex-1 py-4 space-y-1 overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              title={!isExpanded ? item.name : undefined}
              className={`flex items-center gap-4 py-3 pl-5 pr-4 mr-2 transition-all rounded-r-full ${
                isActive 
                  ? 'bg-primary/10 text-primary font-bold border-l-4 border-primary' 
                  : 'text-text-muted hover:bg-bg-input hover:text-text-main border-l-4 border-transparent'
              }`}
            >
              <span className="text-xl shrink-0">{item.icon}</span>
              <span className={`font-medium whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
      
      {showProgress && isExpanded && (
        <div className="px-4 py-2 mx-4 mb-4 bg-bg-dark rounded-lg border border-bg-input animate-in fade-in">
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
      
      <div className="pb-2">
        <button
          onClick={() => {
            if (window.innerWidth < 768) setExpanded(false);
            startTour();
          }}
          title={!isExpanded ? "Replay Tour" : undefined}
          className="flex items-center gap-4 w-full text-left py-3 pl-5 pr-4 mr-2 rounded-r-full border-l-4 border-transparent text-text-muted hover:bg-bg-input hover:text-text-main transition-colors"
        >
          <span className="text-xl shrink-0">🧭</span>
          <span className={`font-medium whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            Replay Tour
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className={`p-4 border-t border-bg-input flex flex-col items-center justify-center gap-1 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden py-0 border-transparent'}`}>
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
