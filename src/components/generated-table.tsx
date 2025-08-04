"use client";
import { useState, useMemo, KeyboardEvent, useEffect } from 'react';
import type { DataRow } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RotateCcw, X, ChevronDown, ArrowUp, ArrowDown, FileDown, Printer, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import LabelPreview from './label-preview';
import { cn } from '@/lib/utils';
import * as xlsx from 'xlsx';


interface GeneratedTableProps {
  data: DataRow[];
  onReset: () => void;
}

type FilterState = Partial<Record<keyof DataRow, string>>;
type SortDirection = 'ascending' | 'descending';
type SortConfig = {
    key: keyof DataRow;
    direction: SortDirection;
} | null;

export default function GeneratedTable({ data, onReset }: GeneratedTableProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [previewData, setPreviewData] = useState<DataRow | null>(null);
  const [printedRows, setPrintedRows] = useState<Set<string>>(new Set());

  const getRowId = (row: DataRow) => `${row.remessa}-${row.ordem}-${row.nCaixas}`;

  const markAsPrinted = (row: DataRow) => {
    setPrintedRows(prev => new Set(prev).add(getRowId(row)));
  };

  const handleFilterChange = (column: keyof DataRow, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  };
  
  const clearFilters = () => {
    setFilters({});
    setSortConfig(null);
  }

  const requestSort = (key: keyof DataRow, direction: SortDirection) => {
    setSortConfig({ key, direction });
  };

  const handlePrintAll = () => {
    if (sortedAndFilteredData.length > 0) {
      const firstPrintableRow = sortedAndFilteredData.find(row => row.br !== 'ATENÇÃO');
      if (firstPrintableRow) {
        setPreviewData(firstPrintableRow);
      }
    }
  };
  
  const handleNavigate = (direction: 'next' | 'prev') => {
    if (!previewData) return;
    
    const printableData = sortedAndFilteredData.filter(row => row.br !== 'ATENÇÃO');
    const currentIndex = printableData.findIndex(item => getRowId(item) === getRowId(previewData));

    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'next') {
        nextIndex = currentIndex + 1;
        if (nextIndex >= printableData.length) {
            setPreviewData(null); // Fecha se for a última
            return;
        }
    } else {
        // Prev logic - not strictly needed by current flow but good to have
        nextIndex = (currentIndex - 1 + printableData.length) % printableData.length;
    }

    setPreviewData(printableData[nextIndex]);
  };


  const handleExport = () => {
    const header = [
      "REMESSA",
      "DATA",
      "BR",
      "CIDADE",
      "CLIENTE",
      "ORDEM",
      "QTD ETIQUETA",
      "Nº CAIXAS",
      "PARCERIA"
    ];

    const body = sortedAndFilteredData.map(row => ({
      "REMESSA": row.remessa,
      "DATA": row.data,
      "BR": row.br,
      "CIDADE": row.cidade,
      "CLIENTE": row.cliente,
      "ORDEM": row.ordem,
      "QTD ETIQUETA": row.qtdEtiqueta,
      "Nº CAIXAS": row.nCaixas,
      "PARCERIA": row.parceria
    }));
    
    const worksheet = xlsx.utils.json_to_sheet(body, { header: header });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Dados");

    // Auto-size columns
    const cols = Object.keys(body[0] || header).map(key => ({
        wch: body.reduce((w, r) => Math.max(w, String(r[key as keyof typeof r]).length), key.length) + 2
    }));
    worksheet["!cols"] = cols;

    xlsx.writeFile(workbook, "relatorio_smart_picking.xlsx");
  };

  const sortedAndFilteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, value]) => value);
    let processableData = [...data];

    // Filtering
    if (activeFilters.length > 0) {
      processableData = processableData.filter((row) => {
        return activeFilters.every(([key, value]) => {
          const rowValue = row[key as keyof DataRow];
          if (row.br === 'ATENÇÃO' && key !== 'br' && key !== 'cliente') {
            return true; // Don't filter attention rows on most columns
          }
          return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
        });
      });
    }

    // Sorting
    if (sortConfig !== null) {
      processableData.sort((a, b) => {
        // Keep "ATENÇÃO" rows in their relative positions after the group they follow
        if (a.br === 'ATENÇÃO' || b.br === 'ATENÇÃO') {
            return 0;
        }

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Handle numeric comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }

        // Handle string comparison (including formatted sequence)
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue, 'pt-BR', { numeric: true });
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        }
        
        return 0;
      });
    }

    return processableData;
  }, [data, filters, sortConfig]);
  
  const HeaderCell = ({ column, label }: { column: keyof DataRow, label: string }) => {
    const [inputValue, setInputValue] = useState(filters[column] || '');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleFilterChange(column, inputValue);
        }
    };
    
    useEffect(() => {
        setInputValue(filters[column] || '');
    }, [filters, column]);


    return (
    <div className="flex items-center gap-2">
        <span className="font-semibold">{label}</span>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">Opções da coluna</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <div className="p-2">
                  <Input
                    type="search"
                    placeholder={`Buscar em ${label}...`}
                    className="w-full h-8 pl-4 pr-2 text-xs"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Filter by ${column}`}
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => requestSort(column, 'ascending')}>
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Ordenar Crescente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => requestSort(column, 'descending')}>
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Ordenar Decrescente
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  )};

  return (
    <Card className="animate-fade-in shadow-lg">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 non-printable">
        <div>
          <CardTitle className="font-headline text-2xl">Dados da Etiqueta</CardTitle>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={handlePrintAll} size="sm" variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={handleExport} size="sm" disabled={sortedAndFilteredData.length === 0} style={{ backgroundColor: '#006443', color: 'white' }}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar para Excel
            </Button>
            <Button onClick={clearFilters} variant="outline" size="sm" disabled={Object.values(filters).every(v => !v) && !sortConfig}>
                <X className="mr-2 h-4 w-4" />
                Limpar Filtros & Ordem
            </Button>
            <Button onClick={onReset} style={{ backgroundColor: '#D40511', color: 'white' }}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Processar Novos Arquivos
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="printable-area">
          <ScrollArea className="border rounded-md h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead><HeaderCell column="remessa" label="REMESSA"/></TableHead>
                  <TableHead><HeaderCell column="data" label="DATA"/></TableHead>
                  <TableHead><HeaderCell column="br" label="BR" /></TableHead>
                  <TableHead><HeaderCell column="cidade" label="CIDADE"/></TableHead>
                  <TableHead><HeaderCell column="cliente" label="CLIENTE"/></TableHead>
                  <TableHead><HeaderCell column="ordem" label="ORDEM"/></TableHead>
                  <TableHead><HeaderCell column="qtdEtiqueta" label="QTD ETIQUETA"/></TableHead>
                  <TableHead><HeaderCell column="nCaixas" label="Nº CAIXAS"/></TableHead>
                  <TableHead><HeaderCell column="parceria" label="PARCERIA"/></TableHead>
                  <TableHead className="non-printable">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredData.length > 0 ? (
                  sortedAndFilteredData.map((row, index) => (
                    <TableRow 
                      key={index} 
                      className={cn(
                        "hover:bg-muted/50",
                        row.br === 'ATENÇÃO' && 'bg-yellow-200/50 dark:bg-yellow-800/50 font-bold',
                        printedRows.has(getRowId(row)) && 'bg-gray-200 dark:bg-gray-700 opacity-60'
                      )}
                    >
                      <TableCell>{row.remessa}</TableCell>
                      <TableCell>{row.data}</TableCell>
                      <TableCell>{row.br}</TableCell>
                      <TableCell>{row.cidade}</TableCell>
                      <TableCell>{row.cliente}</TableCell>
                      <TableCell>{row.ordem}</TableCell>
                      <TableCell className="text-center">
                        {row.br === 'ATENÇÃO' ? '' : String(row.qtdEtiqueta).padStart(2, '0')}
                      </TableCell>
                      <TableCell className="text-center">{row.nCaixas}</TableCell>
                      <TableCell>
                         <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                             row.parceria === 'Sim' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                             row.parceria === 'Não' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                             row.br === 'ATENÇÃO' && 'opacity-0'
                         )}>
                            {row.parceria}
                         </span>
                      </TableCell>
                      <TableCell className="non-printable">
                        {row.br !== 'ATENÇÃO' && (
                          <Button variant="outline" size="icon" onClick={() => setPreviewData(row)}>
                             <Eye className="h-4 w-4" />
                             <span className="sr-only">Visualizar Etiqueta</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                      Nenhum resultado encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <Dialog open={!!previewData} onOpenChange={(isOpen) => !isOpen && setPreviewData(null)}>
          <DialogContent className="p-0 max-w-fit printable-area label-preview-dialog">
            <DialogTitle className="sr-only">Visualização da Etiqueta</DialogTitle>
            {previewData && <LabelPreview data={previewData} onNavigate={handleNavigate} onClose={() => setPreviewData(null)} onPrint={markAsPrinted} />}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
