"use client";

import { useState } from "react";
import Sidebar, { PageId } from "./components/Sidebar";
import DashboardPage from "./pages/dashboard/DashboardPage";
import SEOPositioningPage from "./pages/seo-positioning/SEOPositioningPage";
import GEOPositioningPage from "./pages/geo-positioning/GEOPositioningPage";
import SocialListeningPage from "./pages/social-listening/SocialListeningPage";
import SimulatorStatsPage from "./pages/simulator-stats/SimulatorStatsPage";

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} />;
      case "seo-positioning":
        return <SEOPositioningPage />;
      case "geo-positioning":
        return <GEOPositioningPage />;
      case "social-listening":
        return <SocialListeningPage />;
      case "simulator-stats":
        return <SimulatorStatsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F5F7]">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
}
