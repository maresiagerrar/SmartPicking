"use client";
import { useState, useMemo } from 'react';
import type { DataRow } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GeneratedTableProps {
  data: DataRow[];
  onReset: () => void;
}

export default function GeneratedTable({ data, onReset }: GeneratedTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    const lowercasedFilter = searchTerm.toLowerCase();

    return data.filter((row) =>
      Object.entries(row).some(([key, value]) => {
        return String(value).toLowerCase().includes(lowercasedFilter)
      })
    );
  }, [data, searchTerm]);

  return (
    <Card className="animate-fade-in shadow-lg">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="font-headline text-2xl">2. Tabela de Dados Gerada</CardTitle>
          <CardDescription>
            Os dados processados são exibidos abaixo. Use a busca para filtrar os resultados.
          </CardDescription>
        </div>
        <Button onClick={onReset} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Processar Novos Arquivos
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar em toda a tabela..."
            className="pl-10 w-full md:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="border rounded-md h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="font-semibold">REMESSA</TableHead>
                <TableHead className="font-semibold">DATA</TableHead>
                <TableHead className="font-semibold">BR</TableHead>
                <TableHead className="font-semibold">CIDADE</TableHead>
                <TableHead className="font-semibold">CLIENTE</TableHead>
                <TableHead className="font-semibold">ORDEM</TableHead>
                <TableHead className="font-semibold">QTD DE ETIQUETA</TableHead>
                <TableHead className="font-semibold">SEQUÊNCIA</TableHead>
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
                    Nenhum resultado encontrado para &quot;{searchTerm}&quot;.
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
