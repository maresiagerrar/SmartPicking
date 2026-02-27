
"use client";

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, CheckCircle2, Loader2, Printer, Search, X, Table as TableIcon, FileDown, Download, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import * as xlsx from 'xlsx';
import { cn } from '@/lib/utils';
import ParceriaIdentificationLabel, { type IdentificationData, type IdentificationItem } from './parceria-identification-label';
import ParceriaSummaryLabel, { type SummaryItem } from './parceria-summary-label';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ParceriaIdentificationViewProps {
  hub: 'campinas' | 'contagem';
}

export default function ParceriaIdentificationView({ hub }: ParceriaIdentificationViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<IdentificationData[]>([]);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<IdentificationData | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const formatExcelDate = (val: any) => {
    if (!val) return '';
    if (val instanceof Date) {
      return val.toLocaleDateString('pt-BR');
    }
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toLocaleDateString('pt-BR');
    }
    return String(val).trim();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xlsm')) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, envie um arquivo Excel (.xlsx ou .xlsm).",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setIsLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName = "VL06O";
      
      if (!workbook.SheetNames.includes(sheetName)) {
        toast({
          title: "Aba não encontrada",
          description: "O arquivo deve conter uma aba chamada 'VL06O'.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (json.length < 2) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo não contém dados para processar.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Colunas B (1) e R (17) conforme especificado
      const idxData = 1;
      const idxCE = 17;
      const idxCidade = 10;
      const idxRecebedor = 11;
      const idxMaterial = 12;
      const idxDenominacao = 13;
      const idxQtd = 14;
      const idxLocalidade = 18;
      const idxLinha = 19;

      const groupedMap = new Map<string, IdentificationData>();
      const globalSummaryMap = new Map<string, SummaryItem>();

      json.slice(1).forEach(row => {
        const ceOriginal = String(row[idxCE] || '').trim();
        const dataEntrega = formatExcelDate(row[idxData]);
        
        if (!ceOriginal || ceOriginal === '0' || !dataEntrega) return;

        const groupKey = `${ceOriginal}|${dataEntrega}`;
        const material = String(row[idxMaterial] || '').trim();
        const denominacao = String(row[idxDenominacao] || '').trim();
        const qtd = Number(row[idxQtd] || 0);
        
        const cidade = String(row[idxCidade] || '').trim();
        const recebedor = String(row[idxRecebedor] || '').trim();
        const localidade = String(row[idxLocalidade] || '').trim();
        const linha = String(row[idxLinha] || '').trim();

        if (groupedMap.has(groupKey)) {
          const existing = groupedMap.get(groupKey)!;
          const existingItem = existing.items.find(i => i.material === material);
          if (existingItem) {
            existingItem.qtd += qtd;
          } else {
            existing.items.push({ material, denominacao, qtd });
          }
        } else {
          groupedMap.set(groupKey, {
            fornecimento: ceOriginal,
            cidade,
            recebedor,
            dataEntrega,
            items: [{ material, denominacao, qtd }],
            localidade,
            linha,
            carro: localidade
          });
        }

        if (globalSummaryMap.has(material)) {
          globalSummaryMap.get(material)!.qtd += qtd;
        } else {
          globalSummaryMap.set(material, { material, denominacao, qtd });
        }
      });

      const extractedData = Array.from(groupedMap.values());
      const summary = Array.from(globalSummaryMap.values()).sort((a, b) => a.denominacao.localeCompare(b.denominacao));

      if (extractedData.length === 0) {
        toast({
          title: "Nenhum dado válido encontrado",
          description: "Verifique se a coluna B (Data) e R (CE) estão preenchidas.",
          variant: "destructive",
        });
      } else {
        setData(extractedData);
        setSummaryItems(summary);
        toast({
          title: "Processamento Concluído",
          description: `${extractedData.length} folhas por CE e 1 folha de resumo geradas.`,
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível ler o arquivo Excel.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item => 
      item.fornecimento.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recebedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dataEntrega.includes(searchTerm)
    );
  }, [data, searchTerm]);

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (!selectedItem) return;
    const currentIndex = filteredData.findIndex(i => i.fornecimento === selectedItem.fornecimento && i.dataEntrega === selectedItem.dataEntrega);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % filteredData.length;
    } else {
      nextIndex = (currentIndex - 1 + filteredData.length) % filteredData.length;
    }
    setSelectedItem(filteredData[nextIndex]);
  };

  const handleBulkPrint = () => {
    if (filteredData.length === 0) return;
    setIsBulkPrinting(true);
    setTimeout(() => {
      window.print();
      setIsBulkPrinting(false);
    }, 500);
  };

  const downloadDirectPDF = async () => {
    if (filteredData.length === 0) return;
    
    setIsGeneratingPDF(true);
    setPdfProgress(0);
    
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const container = pdfContainerRef.current;
    if (!container) {
      setIsGeneratingPDF(false);
      return;
    }

    setIsBulkPrinting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pages = container.querySelectorAll('.identification-page-container');
      
      for (let i = 0; i < pages.length; i++) {
        setPdfProgress(Math.round(((i + 1) / pages.length) * 100));
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        canvas.width = 0;
        canvas.height = 0;
      }

      doc.save(`identificacao_CE_${hub}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
      toast({ title: "PDF Gerado com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(false);
      setIsBulkPrinting(false);
      setPdfProgress(0);
    }
  };

  if (isBulkPrinting && !isGeneratingPDF) {
    return (
      <div className="flex flex-col gap-4">
        {filteredData.map((item, idx) => (
          <ParceriaIdentificationLabel key={idx} data={item} hideControls={true} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-2xl border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-center font-headline">Gerando PDF...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={pdfProgress} className="h-4" />
              <p className="text-center text-sm font-medium">{pdfProgress}% concluído</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div ref={pdfContainerRef} style={{ position: 'absolute', left: '-10000px', top: '-10000px', visibility: isGeneratingPDF ? 'visible' : 'hidden' }}>
        {filteredData.map((item, idx) => (
          <ParceriaIdentificationLabel key={idx} data={item} hideControls={true} />
        ))}
      </div>

      <Card className="shadow-lg border-2 border-accent/20 non-printable">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline uppercase">
            <TableIcon className="text-accent h-6 w-6" />
            UNIFICAÇÃO DE PARCERIA BRUTA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className={cn(
              "p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-4",
              file ? "bg-green-50 border-green-500" : "bg-muted/30 border-accent/30 hover:border-accent"
            )}
            onClick={() => inputRef.current?.click()}
          >
            <Input type="file" className="hidden" ref={inputRef} accept=".xlsx,.xlsm" onChange={handleFileChange} />
            {file ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="font-bold text-lg text-green-800">{file.name}</p>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-16 w-16 text-accent opacity-50" />
                <p className="font-bold text-lg">Clique para selecionar o arquivo Excel</p>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {file && data.length === 0 && (
            <Button onClick={processFile} disabled={isLoading} style={{ backgroundColor: '#D40511' }}>
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
              Processar Unificação por CE
            </Button>
          )}
        </CardFooter>
      </Card>

      {data.length > 0 && (
        <Card className="shadow-lg animate-fade-in non-printable">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-xl font-headline">CEs Consolidados ({filteredData.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setShowSummary(true)} variant="outline" className="border-primary text-primary hover:bg-primary/5">
                <FileText className="mr-2 h-4 w-4" />
                Resumo Geral
              </Button>
              <Button onClick={downloadDirectPDF} className="bg-primary hover:bg-primary/90">
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button>
              <Button onClick={handleBulkPrint} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Input 
                placeholder="Filtrar CE ou Cidade..." 
                className="w-48" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead>CE (R)</TableHead>
                    <TableHead>Data Picking (B)</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-center">Qtd Itens</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="font-mono font-bold">{item.fornecimento}</TableCell>
                      <TableCell>{item.dataEntrega}</TableCell>
                      <TableCell className="font-medium">{item.cidade}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{item.items.length}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                          Visualizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-background/95 overflow-y-auto pt-4 pb-12" onClick={() => setSelectedItem(null)}>
           <div className="min-h-full flex items-start justify-center p-4" onClick={(e) => e.stopPropagation()}>
             <ParceriaIdentificationLabel 
                data={selectedItem} 
                onClose={() => setSelectedItem(null)} 
                onNavigate={handleNavigate}
                currentIndex={filteredData.findIndex(i => i.fornecimento === selectedItem.fornecimento && i.dataEntrega === selectedItem.dataEntrega)}
                totalItems={filteredData.length}
             />
           </div>
        </div>
      )}

      {showSummary && (
        <div className="fixed inset-0 z-50 bg-background/95 overflow-y-auto pt-4 pb-12" onClick={() => setShowSummary(false)}>
           <div className="min-h-full flex items-start justify-center p-4" onClick={(e) => e.stopPropagation()}>
             <ParceriaSummaryLabel 
                items={summaryItems} 
                onClose={() => setShowSummary(false)} 
                hub={hub}
             />
           </div>
        </div>
      )}
    </div>
  );
}
