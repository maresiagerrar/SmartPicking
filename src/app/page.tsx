"use client";

import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const hubs = [
    {
      id: "campinas",
      name: "Campinas",
      description: "Operação São Paulo (SJBV, Leme, Pirassununga, Itapeva...)",
      color: "#D40511"
    },
    {
      id: "contagem",
      name: "Contagem",
      description: "Operação Minas Gerais (Região de Contagem e arredores)",
      color: "#FFCC00"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-bold font-headline mb-4">Escolha o seu HUB</h2>
          <p className="text-muted-foreground text-lg">Selecione a unidade de operação para iniciar o processamento dos arquivos.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {hubs.map((hub) => (
            <Link key={hub.id} href={`/${hub.id}`}>
              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border-2 hover:border-primary">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <MapPin className="w-8 h-8 text-primary" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-2 transition-all" />
                  </div>
                  <CardTitle className="text-3xl font-headline mt-4">{hub.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{hub.description}</p>
                  <div className="mt-6 h-1 w-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
