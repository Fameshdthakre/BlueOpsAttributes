import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from '@/app/lib/AppContext';
import { TourProvider } from '@/app/components/TourProvider';
import Sidebar from "@/app/components/Sidebar";
import { Providers } from "@/app/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BlueOps | ASIN Attributes",
  description: "AI-Powered ASIN Attribute Extraction",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-bg-dark text-text-main flex flex-col md:flex-row h-[100dvh] overflow-hidden`}>
        <Providers>
          <TourProvider>
            <Sidebar />
            <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative pt-16 md:pt-0">
              {children}
            </main>
          </TourProvider>
        </Providers>
      </body>
    </html>
  );
}
