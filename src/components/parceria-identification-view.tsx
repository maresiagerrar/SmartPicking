"use client";

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, CheckCircle2, Loader2, Printer, Search, X, Table as TableIcon, FileDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import * as xlsx from 'xlsx';
import { cn } from '@/lib/utils';
import ParceriaIdentificationLabel, { type IdentificationData } from './parceria-identification-label';

interface ParceriaIdentificationViewProps {
  hub: 'campinas' | 'contagem';
}

export default function ParceriaIdentificationView({ hub }: ParceriaIdentificationViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<IdentificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<IdentificationData | null>(null);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      const workbook = xlsx.read(buffer, { type: 'buffer' });
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
      
      // Agrupamento por Fornecimento
      const groupedMap = new Map<string, IdentificationData>();

      json.slice(1).forEach(row => {
        const fornecimento = String(row[0] || '').trim();
        const cidade = String(row[10] || '').trim();
        
        // Filtra linhas inválidas
        if (!fornecimento || !cidade || fornecimento.toUpperCase() === 'FORNECIMENTO') return;

        const material = String(row[12] || '').trim();
        const denominacao = String(row[13] || '').trim();
        const qtd = Number(row[14] || 0);

        if (groupedMap.has(fornecimento)) {
          const existing = groupedMap.get(fornecimento)!;
          // Soma a quantidade
          existing.qtd = Number(existing.qtd) + qtd;
          
          // Se o material for diferente, marca como diversos
          if (existing.material !== material) {
            existing.material = "DIVERSOS";
            existing.denominacao = "ITENS DIVERSOS DA REMESSA";
          }
        } else {
          groupedMap.set(fornecimento, {
            fornecimento,
            cidade,
            recebedor: String(row[11] || '').trim(),
            material,
            denominacao,
            qtd,
            localidade: String(row[18] || '').trim(),
            linha: String(row[19] || '').trim(),
          });
        }
      });

      const extractedData = Array.from(groupedMap.values());

      setData(extractedData);
      toast({
        title: "Sucesso!",
        description: `${extractedData.length} remessas consolidadas da aba VL06O.`,
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
      item.recebedor.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (isBulkPrinting) {
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

  if (selectedItem) {
    return (
      <ParceriaIdentificationLabel 
        data={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        onNavigate={handleNavigate}
        currentIndex={filteredData.indexOf(selectedItem)}
        totalItems={filteredData.length}
      />
    );
  }

  return (
    <div className="space-y-6">
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-headline">Remessas Consolidadas ({filteredData.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleBulkPrint} className="bg-green-700 hover:bg-green-800">
                <FileDown className="mr-2 h-4 w-4" />
                Gerar PDF Único
              </Button>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar fornecimento ou cidade..." 
                  className="pl-8 w-64" 
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
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Fornecimento</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Total UDC</TableHead>
                    <TableHead>Linha</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{item.fornecimento}</TableCell>
                      <TableCell className="font-bold">{item.cidade}</TableCell>
                      <TableCell className="truncate max-w-[200px]">{item.denominacao}</TableCell>
                      <TableCell className="text-center font-bold">{item.qtd} UN</TableCell>
                      <TableCell className="text-center font-black">{item.linha}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                          <Printer className="mr-2 h-4 w-4" />
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
    </div>
  );
}