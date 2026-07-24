import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BlueOps | ASIN Attributes",
  description: "AI-Powered ASIN Attribute Extraction",
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
          <Sidebar />
          <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative pt-16 md:pt-0">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
