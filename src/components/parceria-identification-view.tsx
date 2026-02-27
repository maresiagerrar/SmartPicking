
"use client";

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, CheckCircle2, Loader2, Printer, Search, X, Table as TableIcon, FileDown, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import * as xlsx from 'xlsx';
import { cn } from '@/lib/utils';
import ParceriaIdentificationLabel, { type IdentificationData } from './parceria-identification-label';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ParceriaIdentificationViewProps {
  hub: 'campinas' | 'contagem';
}

export default function ParceriaIdentificationView({ hub }: ParceriaIdentificationViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<IdentificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<IdentificationData | null>(null);
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
      
      const groupedMap = new Map<string, IdentificationData>();

      json.slice(1).forEach(row => {
        const fornecimento = String(row[0] || '').trim();
        const cidade = String(row[10] || '').trim();
        
        if (!fornecimento || !cidade || fornecimento.toUpperCase() === 'FORNECIMENTO') return;

        const material = String(row[12] || '').trim();
        const denominacao = String(row[13] || '').trim();
        const qtd = Number(row[14] || 0);
        const dataEntrega = formatExcelDate(row[1]);
        
        const carro = String(row[17] || '').trim();
        const linha = String(row[19] || '').trim();

        const newItem = {
          material,
          denominacao,
          qtd
        };

        if (groupedMap.has(fornecimento)) {
          const existing = groupedMap.get(fornecimento)!;
          existing.items.push(newItem);
          if (!existing.carro && carro) existing.carro = carro;
          if (!existing.linha && linha) existing.linha = linha;
        } else {
          groupedMap.set(fornecimento, {
            fornecimento,
            cidade,
            recebedor: String(row[11] || '').trim(),
            dataEntrega,
            items: [newItem],
            localidade: String(row[18] || '').trim(),
            carro: carro,
            linha: linha,
          });
        }
      });

      const extractedData = Array.from(groupedMap.values());

      setData(extractedData);
      toast({
        title: "Sucesso!",
        description: `${extractedData.length} remessas consolidadas.`,
      });
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
      item.fornecimento.includes(searchTerm) || 
      item.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recebedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dataEntrega.includes(searchTerm) ||
      item.carro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.linha.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (!selectedItem) return;
    const currentIndex = filteredData.findIndex(i => i.fornecimento === selectedItem.fornecimento);
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
      format: 'a4'
    });

    const container = pdfContainerRef.current;
    if (!container) {
      setIsGeneratingPDF(false);
      return;
    }

    setIsBulkPrinting(true);

    try {
      // Pequeno delay para garantir que o container oculto foi renderizado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pages = container.querySelectorAll('.printable-area');
      
      for (let i = 0; i < pages.length; i++) {
        setPdfProgress(Math.round(((i + 1) / pages.length) * 100));
        
        const page = pages[i] as HTMLElement;
        
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      const fileName = `parceria_bruta_${hub}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Download concluído",
        description: "O arquivo PDF foi salvo na sua máquina.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um problema ao processar as páginas.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
      setIsBulkPrinting(false);
      setPdfProgress(0);
    }
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) return;
    
    const exportData = filteredData.map(item => ({
      "Fornecimento": item.fornecimento,
      "Data Entrega": item.dataEntrega,
      "Cidade": item.cidade,
      "Recebedor": item.recebedor,
      "Carro (R)": item.carro,
      "Linha (T)": item.linha,
      "Localidade": item.localidade,
      "Qtd SKUs": item.items.length,
      "Total UN": item.items.reduce((acc, i) => acc + i.qtd, 0)
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Relatório Parceria");
    xlsx.writeFile(workbook, `relatorio_parceria_${hub}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
    
    toast({
      title: "Download iniciado",
      description: "O arquivo Excel foi gerado com sucesso.",
    });
  };

  if (isBulkPrinting && !isGeneratingPDF) {
    return (
      <div className="printable-area">
        {filteredData.map((item, idx) => (
          <ParceriaIdentificationLabel 
            key={idx}
            data={item} 
            hideControls={true}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center font-headline">Gerando Arquivo PDF...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={pdfProgress} className="h-4" />
              <p className="text-center text-sm font-medium text-muted-foreground">
                Processando página {Math.ceil((pdfProgress / 100) * filteredData.length)} de {filteredData.length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Container escondido para renderização do PDF */}
      <div 
        ref={pdfContainerRef} 
        style={{ 
          position: 'absolute', 
          left: '-10000px', 
          top: '-10000px',
          zIndex: -1,
          visibility: isGeneratingPDF ? 'visible' : 'hidden'
        }}
      >
        {filteredData.map((item, idx) => (
          <ParceriaIdentificationLabel 
            key={idx}
            data={item} 
            hideControls={true}
          />
        ))}
      </div>

      <Card className="shadow-lg border-2 border-accent/20 non-printable">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline uppercase">
            <TableIcon className="text-accent h-6 w-6" />
            Identificação de Parceria Bruta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className={cn(
              "p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-4",
              file ? "bg-green-50 border-green-500" : "bg-muted/30 border-accent/30 hover:border-accent hover:bg-accent/5"
            )}
            onClick={() => inputRef.current?.click()}
          >
            <Input type="file" className="hidden" ref={inputRef} accept=".xlsx,.xlsm" onChange={handleFileChange} />
            {file ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <div className="text-center">
                  <p className="font-bold text-lg text-green-800">{file.name}</p>
                  <Button variant="link" onClick={(e) => { e.stopPropagation(); setFile(null); setData([]); }}>Remover arquivo</Button>
                </div>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-16 w-16 text-accent opacity-50" />
                <div className="text-center">
                  <p className="font-bold text-lg">Selecione o arquivo .xlsm</p>
                  <p className="text-sm text-muted-foreground">Aba necessária: VL06O</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {file && data.length === 0 && (
            <Button onClick={processFile} disabled={isLoading} style={{ backgroundColor: '#D40511' }}>
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
              Carregar e Agrupar Dados
            </Button>
          )}
        </CardFooter>
      </Card>

      {data.length > 0 && (
        <Card className="shadow-lg animate-fade-in non-printable">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-xl font-headline">Remessas Consolidadas ({filteredData.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={exportToExcel} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
                <FileDown className="mr-2 h-4 w-4" />
                Download Excel
              </Button>
              <Button onClick={downloadDirectPDF} className="bg-primary hover:bg-primary/90">
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF Direto
              </Button>
              <Button onClick={handleBulkPrint} variant="outline" className="bg-accent/10 text-accent hover:bg-accent/20">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Tudo
              </Button>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar remessa, cidade..." 
                  className="pl-8 w-48 md:w-64" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Fornecimento</TableHead>
                    <TableHead>Data Entrega</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-center">Qtd Itens</TableHead>
                    <TableHead className="text-center">Total UN</TableHead>
                    <TableHead className="text-center">Carro (R)</TableHead>
                    <TableHead className="text-center">Linha (T)</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => {
                    const totalQtd = item.items.reduce((acc, i) => acc + i.qtd, 0);
                    return (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="font-mono">{item.fornecimento}</TableCell>
                      <TableCell>{item.dataEntrega}</TableCell>
                      <TableCell className="font-bold">{item.cidade}</TableCell>
                      <TableCell className="text-center">{item.items.length}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{totalQtd} UN</TableCell>
                      <TableCell className="text-center font-bold">{item.carro || '-'}</TableCell>
                      <TableCell className="text-center font-bold">{item.linha || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Visualizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
