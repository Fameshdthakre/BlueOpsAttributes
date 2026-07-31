"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/app/lib/AppContext";
import { useSidebar } from "@/app/lib/SidebarContext";
import { useEffect, useState } from "react";

// ── Icon helpers ───────────────────────────────────────────────────────────
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4m0 0c4.418 0 8-1.79 8-4" />
  </svg>
);
const LayersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const ImageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const ListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);
const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);
const MapIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
  </svg>
);

// ── Nav Structure ──────────────────────────────────────────────────────────
const groups = [
  {
    id: "content",
    label: "CONTENT TOOLS",
    items: [
      { name: "Attribute Master", href: "/attribute-master", icon: <DatabaseIcon />, isNew: false },
      { name: "A+ Publisher", href: "/aplus-publisher", icon: <LayersIcon />, isNew: true },
      { name: "AI Studio", href: "/ai-studio", icon: <SparklesIcon />, isNew: true },
      { name: "Images Mapper", href: "/images-mapper", icon: <MapIcon />, isNew: true },
    ],
  },
  {
    id: "audit",
    label: "AUDIT TOOLS",
    items: [
      { name: "Image Auditor", href: "/image-auditor", icon: <ImageIcon />, isNew: true },
      { name: "Listing Auditor", href: "/listing-auditor", icon: <ListIcon />, isNew: true },
    ],
  },
  {
    id: "workspace",
    label: "WORKSPACE",
    items: [
      { name: "Settings", href: "/settings", icon: <SettingsIcon />, isNew: false },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isExpanded, setExpanded } = useSidebar();

  // Track which groups are open (all open by default)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    content: true,
    audit: true,
    workspace: true,
  });

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-collapse sidebar on mobile after navigation
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setExpanded(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setExpanded]);

  useEffect(() => {
    if (window.innerWidth < 768) setExpanded(false);
  }, [pathname, setExpanded]);

  const { running, paused, totalJobsCount, processedCount, limit } = useApp();
  const numLimit = typeof limit === "number" ? limit : 0;
  const targetLimit = numLimit > 0 ? numLimit : totalJobsCount;
  const progressPercent =
    targetLimit > 0 ? Math.round((processedCount / targetLimit) * 100) : 0;
  const showProgress =
    totalJobsCount > 0 && (running || paused || processedCount > 0);

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
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 h-full bg-bg-card border-r border-bg-input flex flex-col transition-all duration-300 ease-in-out
          ${isExpanded ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"}`}
      >
        {/* Dashboard link at top */}
        <Link
          href="/dashboard"
          title={!isExpanded ? "Dashboard" : undefined}
          className={`flex items-center gap-3 px-4 py-4 border-b border-bg-input transition-colors ${
            pathname.startsWith("/dashboard")
              ? "text-primary bg-primary/5"
              : "text-text-muted hover:text-text-main"
          }`}
        >
          <span className="shrink-0"><ChartIcon /></span>
          <span className={`font-bold text-base whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
            Dashboard
          </span>
        </Link>

        <nav className="flex-1 py-3 overflow-x-hidden overflow-y-auto">
          {groups.map((group) => (
            <div key={group.id} className="mb-1">
              {/* Group header (only in expanded mode) */}
              {isExpanded && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest hover:text-text-main transition-colors"
                >
                  {group.label}
                  <ChevronIcon open={openGroups[group.id]} />
                </button>
              )}

              {/* Group separator in collapsed mode */}
              {!isExpanded && (
                <div className="mx-4 my-2 border-t border-bg-input/50" />
              )}

              {/* Items */}
              {(isExpanded ? openGroups[group.id] : true) &&
                group.items.map((item) => {
                  const isActive =
                    item.href === "/attribute-master"
                      ? pathname.startsWith("/attribute-master") || pathname.startsWith("/run")
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={!isExpanded ? item.name : undefined}
                      className={`flex items-center gap-3 py-2.5 pl-4 pr-3 mx-2 my-0.5 rounded-lg transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-text-muted hover:bg-bg-input hover:text-text-main"
                      }`}
                    >
                      <span className="shrink-0 flex items-center">{item.icon}</span>
                      <span className={`text-sm whitespace-nowrap transition-opacity duration-200 ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
                        {item.name}
                      </span>
                      {item.isNew && isExpanded && (
                        <span className="ml-auto text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase tracking-wide">
                          New
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* Progress Indicator */}
        {showProgress && isExpanded && (
          <div className="px-4 py-2 mx-2 mb-2 bg-bg-dark rounded-lg border border-bg-input animate-in fade-in">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {running ? "Processing" : paused ? "Paused" : "Completed"}
              </span>
              <span className="text-xs font-bold text-accent">{progressPercent}%</span>
            </div>
            <div className="w-full bg-bg-input rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${running ? "bg-accent animate-pulse" : paused ? "bg-status-warning" : "bg-status-success"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`p-4 border-t border-bg-input transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden py-0 border-transparent"}`}>
          <div className="text-xs text-text-muted text-center">BlueOps Enterprise v2.0</div>
          <div className="text-[10px] text-text-muted text-center mt-1">
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/famesh-thakre-6a2825118"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Famesh Thakre
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
