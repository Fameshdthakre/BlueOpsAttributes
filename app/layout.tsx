import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/app/lib/AppContext";
import { TourProvider } from "@/app/components/TourProvider";
import Sidebar from "@/app/components/Sidebar";
import Topbar from "@/app/components/Topbar";
import { Providers } from "@/app/components/Providers";
import { SidebarProvider } from "@/app/lib/SidebarContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BlueOps | ASIN Attributes",
  description: "AI-Powered ASIN Attribute Extraction",
  icons: {
    icon: "/logo.png",
  },
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-bg-dark text-text-main flex flex-col h-[100dvh] overflow-hidden`}
      >
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
        <Providers>
          <TourProvider>
            <SidebarProvider>
              {/* GCP Style Topbar */}
              <Topbar />

              {/* Main App Container */}
              <div className="flex flex-1 overflow-hidden bg-bg-card">
                <Sidebar />
                <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative bg-bg-dark rounded-tl-2xl border-t border-l border-bg-input">
                  {children}
                </main>
              </div>
            </SidebarProvider>
          </TourProvider>
        </Providers>
      </body>
    </html>
  );
}
