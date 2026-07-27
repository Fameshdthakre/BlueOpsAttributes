"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/app/lib/AppContext';
import { useSidebar } from '@/app/lib/SidebarContext';
import { useEffect } from 'react';

const navItems = [
  { name: 'Input', href: '/input', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
  ) },
  { name: 'Process', href: '/process', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ) },
  { name: 'History', href: '/history', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ) },
];

export default function Sidebar() {
  const pathname = usePathname();
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
        fixed md:static inset-y-0 left-0 z-40 h-full bg-bg-card flex flex-col transition-all duration-300 ease-in-out
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
              <span className="shrink-0 flex items-center justify-center">{item.icon}</span>
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
