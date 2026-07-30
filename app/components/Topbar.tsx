"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useSidebar } from "@/app/lib/SidebarContext";
import { useTour } from "@/app/components/TourProvider";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Settings, User } from "lucide-react";

export default function Topbar() {
  const { toggleSidebar, isExpanded } = useSidebar();
  const { startTour } = useTour();
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = session?.user?.name
    ? session.user.name.substring(0, 2).toUpperCase()
    : session?.user?.email 
      ? session.user.email.substring(0, 2).toUpperCase() 
      : "BO";

  return (
    <header className="flex h-16 w-full items-center justify-between bg-bg-card px-4 z-50 relative">
      <div className="flex items-center gap-4">
        {/* Hamburger Menu */}
        <button
          onClick={toggleSidebar}
          className="rounded p-2 text-text-muted hover:bg-bg-input hover:text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Toggle Navigation"
          title="Toggle Navigation"
        >
          <svg
            className={`h-6 w-6 transition-transform duration-300 ${!isExpanded ? "rotate-90" : "rotate-0"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Logo and Title */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="BlueOps Logo"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="hidden sm:block text-xl font-bold tracking-tight text-text-main">
            BlueOps
          </span>
        </Link>
      </div>

      {/* Right-side Action Icons */}
      <div className="flex items-center gap-2">
        <button
          onClick={startTour}
          className="rounded p-2 text-text-muted hover:bg-bg-input hover:text-text-main"
          aria-label="Replay Tour"
          title="Replay Tour"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </button>
        <button
          className="rounded p-2 text-text-muted hover:bg-bg-input hover:text-text-main"
          aria-label="Notifications"
          title="Notifications"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
        
        {/* Profile Dropdown */}
        <div className="relative ml-2" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary hover:bg-blue-600 transition-colors text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-card overflow-hidden"
            aria-label="Profile Menu"
            title={session?.user?.name || session?.user?.email || "Profile"}
          >
            {session?.user?.image ? (
              <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-bg-dark border border-bg-input rounded-xl shadow-xl py-1 z-50">
              <div className="px-4 py-3 border-b border-bg-input">
                <p className="text-sm font-bold text-text-main truncate">
                  {session?.user?.name || session?.user?.email || "Not signed in"}
                </p>
                {session?.user?.name && (
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {session.user.email}
                  </p>
                )}
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:bg-bg-input hover:text-text-main transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
