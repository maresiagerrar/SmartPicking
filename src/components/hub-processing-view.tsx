
"use client";

import { useState } from "react";
import FileUploadCard from "@/components/file-upload-card";
import GeneratedTable from "@/components/generated-table";
import type { DataRow } from "@/lib/types";
import { processFiles } from "@/lib/flows/process-files-flow";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, Ticket, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ParceriaIdentificationView from "./parceria-identification-view";
import { convertPdfToTxt } from "@/lib/pdf-parser";

interface HubProcessingViewProps {
  hub: 'campinas' | 'contagem';
}

type ViewMode = 'selection' | 'etiqueta' | 'identificacao';

export default function HubProcessingView({ hub }: HubProcessingViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
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

  const handleProcessing = async (txtFile: File, excelFile: File, shipTrackerFile?: File) => {
    setIsLoading(true);

    try {
      let txtContent = "";
      if (txtFile.name.toLowerCase().endsWith('.pdf') || txtFile.type === 'application/pdf') {
        const buffer = await txtFile.arrayBuffer();
        txtContent = await convertPdfToTxt(buffer);
      } else {
        txtContent = await txtFile.text();
      }
      
      const excelContent = await excelFile.arrayBuffer();
      const excelBase64 = arrayBufferToBase64(excelContent);
      
      let shipTrackerBase64: string | undefined = undefined;
      if (shipTrackerFile) {
          const shipTrackerBuffer = await shipTrackerFile.arrayBuffer();
          shipTrackerBase64 = arrayBufferToBase64(shipTrackerBuffer);
      }

      const result = await processFiles({ 
        txtContent, 
        excelContent: excelBase64,
        shipTrackerContent: shipTrackerBase64,
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

  const handleBackToSelection = () => {
    setViewMode('selection');
    handleReset();
  };

  if (viewMode === 'selection') {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para HUBs
            </Button>
          </Link>
          <div className="text-right">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">HUB ATIVO</span>
            <h3 className="text-xl font-bold font-headline uppercase">{hub}</h3>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card 
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary"
            onClick={() => setViewMode('etiqueta')}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <Ticket className="w-8 h-8 text-primary" />
                </div>
                <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-2 transition-all" />
              </div>
              <CardTitle className="text-2xl font-headline mt-4">ETIQUETA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Processamento de arquivos TARJA e VL06O para geração de etiquetas e relatórios.</p>
            </CardContent>
          </Card>

          <Card 
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-accent"
            onClick={() => setViewMode('identificacao')}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-lg bg-muted group-hover:bg-accent/10 transition-colors">
                  <Search className="w-8 h-8 text-accent" />
                </div>
                <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-accent transform group-hover:translate-x-2 transition-all" />
              </div>
              <CardTitle className="text-2xl font-headline mt-4 uppercase">Identificação Parceria Bruta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Ferramenta para identificação e triagem de itens de parceria bruta.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between non-printable">
        <Button variant="ghost" size="sm" onClick={handleBackToSelection}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Voltar para Opções do HUB
        </Button>
        <div className="text-right">
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">HUB {hub}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                  {viewMode === 'etiqueta' ? 'Etiqueta' : 'Parceria Bruta'}
                </span>
             </div>
          </div>
        </div>
      </div>

      {viewMode === 'etiqueta' ? (
        <>
          { !mainData ? (
            <FileUploadCard onProcess={handleProcessing} isLoading={isLoading} hub={hub} />
          ) : (
            <div className="printable-area">
              <GeneratedTable data={mainData} parceriaData={parceriaData || []} onReset={handleReset} />
            </div>
          )}
        </>
      ) : (
        <ParceriaIdentificationView hub={hub} />
      )}
    </div>
  );
}
