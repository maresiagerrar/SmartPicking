"use client";

import { useState } from "react";
import FileUploadCard from "@/components/file-upload-card";
import GeneratedTable from "@/components/generated-table";
import type { DataRow } from "@/lib/types";
import { processFiles } from "@/ai/flows/process-files-flow";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface HubProcessingViewProps {
  hub: 'campinas' | 'contagem';
}

export default function HubProcessingView({ hub }: HubProcessingViewProps) {
  const [mainData, setMainData] = useState<DataRow[] | null>(null);
  const [parceriaData, setParceriaData] = useState<DataRow[] | null>(null);
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

      const result = await processFiles({ 
        txtContent, 
        excelContent: excelBase64,
        hub: hub
      });
      
      if (result && result.mainData && result.mainData.length > 0) {
        setMainData(result.mainData);
        setParceriaData(result.parceriaData);
      } else {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não foi possível extrair dados dos arquivos. Verifique o formato.",
          variant: "destructive",
        });
      }
    } catch (error) {
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
    setMainData(null);
    setParceriaData(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between non-printable">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar para HUBs
          </Button>
        </Link>
        <div className="text-right">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">HUB ATIVO</span>
          <h3 className="text-lg font-bold font-headline uppercase">{hub}</h3>
        </div>
      </div>

      { !mainData ? (
        <FileUploadCard onProcess={handleProcessing} isLoading={isLoading} />
      ) : (
        <div className="printable-area">
          <GeneratedTable data={mainData} parceriaData={parceriaData || []} onReset={handleReset} />
        </div>
      )}
    </div>
  );
}
