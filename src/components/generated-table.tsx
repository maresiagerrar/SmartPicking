"use client";
import { useState, useMemo, KeyboardEvent, useEffect } from 'react';
import type { DataRow } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RotateCcw, X, ChevronDown, ArrowUp, ArrowDown, FileDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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

  const handleExport = () => {
    const header = [
      "REMESSA",
      "DATA",
      "BR",
      "CIDADE",
      "CLIENTE",
      "ORDEM",
      "QTD ETIQUETA",
      "SEQUÊNCIA",
    ];

    const body = sortedAndFilteredData.map(row => ({
      "REMESSA": row.remessa,
      "DATA": row.data,
      "BR": row.br,
      "CIDADE": row.cidade,
      "CLIENTE": row.cliente,
      "ORDEM": row.ordem,
      "QTD ETIQUETA": row.qtdEtiqueta,
      "SEQUÊNCIA": row.sequencia
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
          return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
        });
      });
    }

    // Sorting
    if (sortConfig !== null) {
      processableData.sort((a, b) => {
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
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="font-headline text-2xl">Dados da Etiqueta</CardTitle>
        </div>
        <div className="flex items-center gap-2">
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
                <TableHead><HeaderCell column="sequencia" label="SEQUÊNCIA"/></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredData.length > 0 ? (
                sortedAndFilteredData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell>{row.remessa}</TableCell>
                    <TableCell>{row.data}</TableCell>
                    <TableCell>{row.br}</TableCell>
                    <TableCell>{row.cidade}</TableCell>
                    <TableCell>{row.cliente}</TableCell>
                    <TableCell>{row.ordem}</TableCell>
                    <TableCell className="text-center">{row.qtdEtiqueta}</TableCell>
                    <TableCell className="text-center">{row.sequencia}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
