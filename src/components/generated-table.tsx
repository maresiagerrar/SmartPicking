"use client";
import { useState, useMemo } from 'react';
import type { DataRow } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GeneratedTableProps {
  data: DataRow[];
  onReset: () => void;
}

type FilterState = Partial<Record<keyof DataRow, string>>;

export default function GeneratedTable({ data, onReset }: GeneratedTableProps) {
  const [filters, setFilters] = useState<FilterState>({});

  const handleFilterChange = (column: keyof DataRow, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  };
  
  const clearFilters = () => {
    setFilters({});
  }

  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, value]) => value);

    if (activeFilters.length === 0) return data;

    return data.filter((row) => {
      return activeFilters.every(([key, value]) => {
        const rowValue = row[key as keyof DataRow];
        return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }, [data, filters]);

  const FilterInput = ({ column }: { column: keyof DataRow }) => (
    <div className="relative">
      <Input
        type="search"
        placeholder={`Buscar ${column}...`}
        className="w-full h-8 pl-4 pr-2 text-xs"
        value={filters[column] || ''}
        onChange={(e) => handleFilterChange(column, e.target.value)}
        aria-label={`Filter by ${column}`}
      />
    </div>
  );

  return (
    <Card className="animate-fade-in shadow-lg">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="font-headline text-2xl">2. Tabela de Dados Gerada</CardTitle>
          <CardDescription>
            Os dados processados são exibidos abaixo. Use os campos em cada coluna para filtrar os resultados.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={clearFilters} variant="outline" size="sm" disabled={Object.values(filters).every(v => !v)}>
                <X className="mr-2 h-4 w-4" />
                Limpar Filtros
            </Button>
            <Button onClick={onReset} variant="outline">
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
                <TableHead className="font-semibold align-top"><div className="pb-2">REMESSA</div><FilterInput column="remessa" /></TableHead>
                <TableHead className="font-semibold align-top"><div className="pb-2">DATA</div><FilterInput column="data" /></TableHead>
                <TableHead className="font-semibold align-top"><div className="pb-2">BR</div><FilterInput column="br" /></TableHead>
                <TableHead className="font-semibold align-top"><div className="pb-2">CIDADE</div><FilterInput column="cidade" /></TableHead>
                <TableHead className="font-semibold align-top"><div className="pb-2">CLIENTE</div><FilterInput column="cliente" /></TableHead>
                <TableHead className="font-semibold align-top"><div className="pb-2">ORDEM</div><FilterInput column="ordem" /></TableHead>
                <TableHead className="font-semibold align-top"><div className="pb-2">QTD DE ETIQUETA</div><FilterInput column="qtdEtiqueta" /></TableHead>
                <TableHead className="font-semibold align-top"><div className="pb-2">SEQUÊNCIA</div><FilterInput column="sequencia" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
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
