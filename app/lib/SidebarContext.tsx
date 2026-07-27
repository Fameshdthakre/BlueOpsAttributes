"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isExpanded: boolean;
  toggleSidebar: () => void;
  setExpanded: (expanded: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Default to expanded on desktop
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isExpanded, toggleSidebar, setExpanded: setIsExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
