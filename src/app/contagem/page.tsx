"use client";

import dynamic from "next/dynamic";
import Header from "@/components/layout/header";

const HubProcessingView = dynamic(() => import("@/components/hub-processing-view"), {
  ssr: false,
});

export default function ContagemPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <HubProcessingView hub="contagem" />
      </main>
    </div>
  );
}
