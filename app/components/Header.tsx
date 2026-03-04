"use client";

import { Bell, RefreshCw, Search } from "lucide-react";
import { PageId } from "./Sidebar";

const pageTitles: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Vue d'ensemble de votre performance SEO",
  },
  "dust-agents": {
    title: "Agents IA Dust",
    subtitle: "Connectez et gérez vos agents d'intelligence artificielle",
  },
  "seo-positioning": {
    title: "Positionnement SEO",
    subtitle: "Analyse des positions et mots-clés organiques de PayFit",
  },
  "geo-positioning": {
    title: "Positionnement GEO",
    subtitle:
      "Générative Engine Optimization — visibilité dans les réponses IA",
  },
  "competitive-analysis": {
    title: "Analyse Concurrentielle",
    subtitle: "Comparez PayFit face à ses concurrents clés",
  },
  "social-listening": {
    title: "Social Listening",
    subtitle: "Surveillance des mentions sur Reddit, Twitter & LinkedIn",
  },
};

interface HeaderProps {
  currentPage: PageId;
}

export default function Header({ currentPage }: HeaderProps) {
  const { title, subtitle } = pageTitles[currentPage];

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-400">
          <Search size={14} />
          <input
            type="text"
            placeholder="Rechercher..."
            className="bg-transparent outline-none text-slate-700 placeholder-slate-400 w-40"
          />
          <kbd className="text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </div>
        {/* Refresh */}
        <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <RefreshCw size={16} />
        </button>
        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        {/* Last update */}
        <span className="hidden md:inline text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          Mis à jour il y a 2 min
        </span>
      </div>
    </header>
  );
}
