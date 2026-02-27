
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
      
      if (json.length < 2) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo não contém dados para processar.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const headers = (json[0] || []).map(h => String(h).toUpperCase().trim());
      
      const findColIdx = (possibleNames: string[], defaultIdx: number) => {
        const found = headers.findIndex(h => possibleNames.includes(h));
        return found !== -1 ? found : defaultIdx;
      };

      // Mapeamento dinâmico das colunas pelos nomes
      const idx = {
        fornecimento: findColIdx(['FORNECIMENTO', 'DOC. TRANSPORTE', 'REMESSA'], 0),
        data: findColIdx(['DATA PLANEJADA', 'DATA DE ENTREGA', 'DATA'], 1),
        cidade: findColIdx(['CIDADE', 'DESTINO'], 10),
        recebedor: findColIdx(['RECEBEDOR', 'NOME DO CLIENTE'], 11),
        material: findColIdx(['MATERIAL', 'SKU'], 12),
        denominacao: findColIdx(['DENOMINAÇÃO', 'DESCRIÇÃO'], 13),
        qtd: findColIdx(['QTD', 'QUANTIDADE', 'QTD.FORN.'], 14),
        carro: findColIdx(['CARRO', 'VEICULO', 'PLACA'], 17), // Coluna R
        localidade: findColIdx(['LOCALIDADE', 'ESTOQUE'], 18),
        linha: findColIdx(['LINHA', 'ROTA'], 19), // Coluna T
        ce: findColIdx(['CE', 'CARREGAMENTO', 'NÚMERO CE', 'CARREG'], 82) // Coluna CE
      };

      const groupedMap = new Map<string, IdentificationData>();

      json.slice(1).forEach(row => {
        // Puxa o valor da coluna CE (índice mapeado) para identificar a folha
        const ceOriginal = String(row[idx.ce] || '').trim();
        const dataEntrega = formatExcelDate(row[idx.data]);
        
        // Se CE for vazio ou 0, ignoramos ou tratamos
        if (!ceOriginal || ceOriginal === '0' || !dataEntrega) return;

        // Unificamos por CE + DATA conforme solicitado
        const groupKey = `${ceOriginal}|${dataEntrega}`;

        const material = String(row[idx.material] || '').trim();
        const denominacao = String(row[idx.denominacao] || '').trim();
        const qtd = Number(row[idx.qtd] || 0);
        
        const cidade = String(row[idx.cidade] || '').trim();
        const recebedor = String(row[idx.recebedor] || '').trim();
        const carro = String(row[idx.carro] || '').trim();
        const linha = String(row[idx.linha] || '').trim();
        const localidade = String(row[idx.localidade] || '').trim();

        const newItem = {
          material,
          denominacao,
          qtd
        };

        if (groupedMap.has(groupKey)) {
          const existing = groupedMap.get(groupKey)!;
          
          const existingItem = existing.items.find(i => i.material === material);
          if (existingItem) {
            existingItem.qtd += qtd;
          } else {
            existing.items.push(newItem);
          }
          
          if (!existing.carro && carro) existing.carro = carro;
          if (!existing.linha && linha) existing.linha = linha;
          if (!existing.cidade && cidade) existing.cidade = cidade;
          if (!existing.recebedor && recebedor) existing.recebedor = recebedor;
        } else {
          groupedMap.set(groupKey, {
            fornecimento: ceOriginal, // Usamos o CE como código principal da folha
            cidade,
            recebedor,
            dataEntrega,
            items: [newItem],
            localidade,
            carro,
            linha,
          });
        }
      });

      const extractedData = Array.from(groupedMap.values());

      if (extractedData.length === 0) {
        toast({
          title: "Nenhum dado válido encontrado",
          description: "Verifique se o arquivo possui as colunas necessárias (CE, Data, etc).",
          variant: "destructive",
        });
      } else {
        setData(extractedData);
        toast({
          title: "Sucesso!",
          description: `${extractedData.length} folhas de identificação geradas.`,
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
      item.dataEntrega.includes(searchTerm) ||
      (item.carro && item.carro.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.linha && item.linha.toLowerCase().includes(searchTerm.toLowerCase()))
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
    
    // Configura jsPDF com compressão ativada
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
      // Pequeno atraso para garantir renderização do container invisível
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pages = container.querySelectorAll('.printable-area');
      
      for (let i = 0; i < pages.length; i++) {
        setPdfProgress(Math.round(((i + 1) / pages.length) * 100));
        
        const page = pages[i] as HTMLElement;
        
        // Escala reduzida para 1.5 para salvar memória sem perder muita qualidade
        const canvas = await html2canvas(page, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794, // Largura aproximada de A4 em 96dpi
        });
        
        // Usa JPEG com compressão rápida para evitar RangeError no buffer de string
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        
        // Limpeza de memória do canvas para a próxima iteração
        canvas.width = 0;
        canvas.height = 0;
      }

      const fileName = `identificacao_CE_${hub}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Download concluído",
        description: "O arquivo PDF foi salvo na sua máquina.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao gerar PDF",
        description: "O volume de dados é muito alto. Tente filtrar por data antes de baixar.",
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
      "CE": item.fornecimento,
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
    xlsx.utils.book_append_sheet(workbook, worksheet, "Relatório CE");
    xlsx.writeFile(workbook, `relatorio_CE_${hub}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
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
          <Card className="w-full max-w-md shadow-2xl border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-center font-headline">Gerando Arquivo PDF...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={pdfProgress} className="h-4" />
              <p className="text-center text-sm font-medium text-muted-foreground">
                Processando página {Math.ceil((pdfProgress / 100) * filteredData.length)} de {filteredData.length}
              </p>
              <p className="text-xs text-center text-muted-foreground italic">
                Aguarde a conclusão, o download iniciará automaticamente.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Container invisível para captura do PDF */}
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
            Identificação por CE (Agrupado por Data)
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
              Gerar Folhas por CE e Data
            </Button>
          )}
        </CardFooter>
      </Card>

      {data.length > 0 && (
        <Card className="shadow-lg animate-fade-in non-printable">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-xl font-headline">CEs Consolidados ({filteredData.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={exportToExcel} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
                <FileDown className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button onClick={downloadDirectPDF} className="bg-primary hover:bg-primary/90">
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF Direto
              </Button>
              <Button onClick={handleBulkPrint} variant="outline" className="bg-accent/10 text-accent hover:bg-accent/20">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar CE, cidade, data..." 
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
                    <TableHead>CE (Identificação)</TableHead>
                    <TableHead>Data Entrega</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-center">Total UN</TableHead>
                    <TableHead className="text-center">Carro</TableHead>
                    <TableHead className="text-center">Linha</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => {
                    const totalQtd = item.items.reduce((acc, i) => acc + i.qtd, 0);
                    return (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="font-mono font-bold">{item.fornecimento}</TableCell>
                      <TableCell>{item.dataEntrega}</TableCell>
                      <TableCell className="font-medium">{item.cidade}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{totalQtd} UN</TableCell>
                      <TableCell className="text-center">{item.carro || '-'}</TableCell>
                      <TableCell className="text-center">{item.linha || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Ver
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
    </div>
  );
}
