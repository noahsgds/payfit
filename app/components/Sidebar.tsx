"use client";

import { useState } from "react";
import {
  Search,
  Globe,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
  Settings,
  HelpCircle,
  BarChart2,
  Bot,
} from "lucide-react";

export type PageId =
  | "dashboard"
  | "seo-positioning"
  | "geo-positioning"
  | "social-listening"
  | "simulator-stats"
  | "dust-agents"
  | "claude-seo";

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  {
    id: "seo-positioning",
    label: "Positionnement SEO",
    icon: <Search size={18} />,
  },
  {
    id: "geo-positioning",
    label: "Positionnement GEO",
    icon: <Globe size={18} />,
    badge: "New",
  },
  {
    id: "social-listening",
    label: "Social Listening",
    icon: <MessageSquare size={18} />,
  },
  {
    id: "simulator-stats",
    label: "Analytics Simulateurs",
    icon: <BarChart2 size={18} />,
    badge: "New",
  },
  {
    id: "dust-agents",
    label: "Agents Dust",
    icon: <Sparkles size={18} />,
    badge: "API",
  },
  {
    id: "claude-seo",
    label: "Claude SEO",
    icon: <Bot size={18} />,
    badge: "New",
  },
];

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex flex-col h-screen transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      }`}
      style={{ backgroundColor: "#ffffff", borderRight: "1px solid #e2e8f0" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
          style={{ backgroundColor: "#1B6EF3" }}
        >
          P
        </div>
        {!collapsed && (
          <div className="fade-in">
            <p className="text-slate-900 font-bold text-sm leading-none">PayFit</p>
            <p className="text-slate-400 text-xs mt-0.5">SEO Intelligence</p>
          </div>
        )}
      </div>

      {/* AI indicator */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 fade-in">
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-[#1B6EF3]" />
            <span className="text-xs text-[#1B6EF3] font-medium">
              Powered by Dust AI
            </span>
            <span
              className="ml-auto w-2 h-2 rounded-full bg-[#1B6EF3] animate-pulse-dot"
              style={{ display: "inline-block" }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Navigation
          </p>
        )}
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  currentPage === item.id
                    ? "bg-[#1B6EF3] text-white shadow-lg shadow-[#1B6EF3]/20"
                    : "text-slate-500 hover:bg-blue-50 hover:text-[#1B6EF3]"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                          currentPage === item.id
                            ? "bg-white/20 text-white"
                            : "bg-blue-100 text-[#1B6EF3]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {/* Tooltip on collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-4 border-t border-slate-100 pt-3 space-y-1">
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-blue-50 hover:text-[#1B6EF3] transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Settings size={16} />
          {!collapsed && <span>Paramètres</span>}
        </button>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-blue-50 hover:text-[#1B6EF3] transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <HelpCircle size={16} />
          {!collapsed && <span>Aide</span>}
        </button>
        {/* User */}
        <div
          className={`flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-slate-50 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1B6EF3] to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            S
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-slate-800 text-xs font-medium truncate">
                Équipe SEO
              </p>
              <p className="text-slate-400 text-xs truncate">PayFit</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-[#1B6EF3] transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
