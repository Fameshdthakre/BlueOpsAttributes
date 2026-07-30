import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TourProvider } from "@/app/components/TourProvider";
import { Providers } from "@/app/components/Providers";
import { SidebarProvider } from "@/app/lib/SidebarContext";
import { AppLayoutWrapper } from "@/app/components/AppLayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BlueOps Enterprise | Amazon Ops Platform",
  description: "AI-Powered Amazon Operations: Attribute Extraction, A+ Publishing, Image Auditing, Listing Scraping",
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
              <AppLayoutWrapper>{children}</AppLayoutWrapper>
            </SidebarProvider>
          </TourProvider>
        </Providers>
      </body>
    </html>
  );
}
