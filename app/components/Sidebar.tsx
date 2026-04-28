"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, DollarSign, PieChart, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const menuItems = [
  { 
    name: "ICD Operations", 
    path: "/icd-operations",
    icon: LayoutDashboard,
  },
  { 
    name: "Cashflow", 
    path: "/cashflow",
    icon: DollarSign,
  },
  { 
    name: "Financial position", 
    path: "/financial-position",
    icon: PieChart,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`sticky top-0 h-screen shrink-0 self-start overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-800 text-white border-r border-slate-700 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`p-6 ${isCollapsed ? "px-3" : ""}`}>
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && (
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                ICD Dashboards
              </h1>
              <p className="text-xs text-slate-400 mt-1">Analytics & Insights</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`text-slate-400 hover:text-white hover:bg-slate-700/50 ${
              isCollapsed ? "mx-auto" : ""
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {!isCollapsed && <Separator className="bg-slate-700" />}
        
        <nav className="mt-6">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link href={item.path}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size={isCollapsed ? "icon" : "default"}
                      className={`${isCollapsed ? "" : "w-full justify-start gap-3"} ${
                        isActive 
                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                          : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                      }`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      {!isCollapsed && <span className="font-medium">{item.name}</span>}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
