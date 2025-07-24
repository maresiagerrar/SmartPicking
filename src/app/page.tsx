"use client";

import { useState } from "react";
import Header from "@/components/layout/header";
import FileUploadCard from "@/components/file-upload-card";
import GeneratedTable from "@/components/generated-table";
import type { DataRow } from "@/lib/types";
import { processFiles } from "@/ai/flows/process-files-flow";
import { useToast } from "@/hooks/use-toast";


export default function Home() {
  const [data, setData] = useState<DataRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  const handleProcessing = async (txtFile: File, excelFile: File) => {
    setIsLoading(true);

    try {
      const txtContent = await txtFile.text();
      const excelContent = await excelFile.arrayBuffer();
      const excelBase64 = arrayBufferToBase64(excelContent);

      const result = await processFiles({ txtContent, excelContent: excelBase64 });
      
      if (result && result.length > 0) {
        setData(result);
      } else {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não foi possível extrair dados dos arquivos. Verifique o formato.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Erro ao processar arquivos",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
            <div className="printable-area">
              <GeneratedTable data={data} onReset={handleReset} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
