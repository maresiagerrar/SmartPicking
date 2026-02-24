"use client";

import Header from "@/components/layout/header";
import HubProcessingView from "@/components/hub-processing-view";

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
