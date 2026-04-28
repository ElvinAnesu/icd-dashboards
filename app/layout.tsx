import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "ICD Dashboards",
  description: "ICD Dashboards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-slate-50 dark:bg-slate-950">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 bg-slate-50">{children}</main>
        </div>
      </body>
    </html>
  );
}
