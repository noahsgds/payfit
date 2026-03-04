"use client";

import { useState } from "react";
import Sidebar, { PageId } from "./components/Sidebar";
import Header from "./components/Header";
import DashboardPage from "./pages/dashboard/DashboardPage";
import DustAgentsPage from "./pages/dust-agents/DustAgentsPage";
import SEOPositioningPage from "./pages/seo-positioning/SEOPositioningPage";
import GEOPositioningPage from "./pages/geo-positioning/GEOPositioningPage";
import CompetitiveAnalysisPage from "./pages/competitive-analysis/CompetitiveAnalysisPage";
import SocialListeningPage from "./pages/social-listening/SocialListeningPage";

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} />;
      case "dust-agents":
        return <DustAgentsPage />;
      case "seo-positioning":
        return <SEOPositioningPage />;
      case "geo-positioning":
        return <GEOPositioningPage />;
      case "competitive-analysis":
        return <CompetitiveAnalysisPage />;
      case "social-listening":
        return <SocialListeningPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F5F7]">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentPage={currentPage} />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
}
