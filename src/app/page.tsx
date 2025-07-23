"use client";

import { useState } from "react";
import Header from "@/components/layout/header";
import FileUploadCard from "@/components/file-upload-card";
import GeneratedTable from "@/components/generated-table";
import type { DataRow } from "@/lib/types";

const mockData: DataRow[] = [
    { remessa: "7701435280", data: "23/07/2024", br: "1001", cidade: "SAO PAULO", cliente: "EXTRA", linha: "LINHA 1", qtdEtiqueta: 1, sequencia: 1 },
    { remessa: "7701435281", data: "23/07/2024", br: "1002", cidade: "RIO DE JANEIRO", cliente: "PÃO DE AÇÚCAR", linha: "LINHA 2", qtdEtiqueta: 2, sequencia: 2 },
    { remessa: "7701435282", data: "23/07/2024", br: "1003", cidade: "BELO HORIZONTE", cliente: "CARREFOUR", linha: "LINHA 3", qtdEtiqueta: 3, sequencia: 3 },
    { remessa: "7701435283", data: "24/07/2024", br: "1004", cidade: "SALVADOR", cliente: "BIG BOMPREÇO", linha: "LINHA 4", qtdEtiqueta: 4, sequencia: 4 },
    { remessa: "7701435284", data: "24/07/2024", br: "1005", cidade: "RECIFE", cliente: "ATACADÃO", linha: "LINHA 5", qtdEtiqueta: 5, sequencia: 5 },
    { remessa: "7701435285", data: "24/07/2024", br: "1006", cidade: "FORTALEZA", cliente: "ASSÍ", linha: "LINHA 6", qtdEtiqueta: 6, sequencia: 6 },
    { remessa: "7701435286", data: "25/07/2024", br: "1007", cidade: "CURITIBA", cliente: "MERCADO LIVRE", linha: "LINHA 7", qtdEtiqueta: 7, sequencia: 7 },
    { remessa: "7701435287", data: "25/07/2024", br: "1008", cidade: "PORTO ALEGRE", cliente: "AMERICANAS", linha: "LINHA 8", qtdEtiqueta: 8, sequencia: 8 },
    { remessa: "7701435288", data: "25/07/2024", br: "1009", cidade: "BRASÍLIA", cliente: "MAGAZINE LUIZA", linha: "LINHA 9", qtdEtiqueta: 9, sequencia: 9 },
    { remessa: "7701435289", data: "26/07/2024", br: "1010", cidade: "MANAUS", cliente: "CASAS BAHIA", linha: "LINHA 10", qtdEtiqueta: 10, sequencia: 10 },
];

export default function Home() {
  const [data, setData] = useState<DataRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProcessing = () => {
    setIsLoading(true);
    setTimeout(() => {
      setData(mockData);
      setIsLoading(false);
    }, 2500);
  };
  
  const handleReset = () => {
    setData(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          { !data ? (
            <FileUploadCard onProcess={handleProcessing} isLoading={isLoading} />
          ) : (
            <GeneratedTable data={data} onReset={handleReset} />
          )}
        </div>
      </main>
    </div>
  );
}
