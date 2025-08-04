
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import Header from "@/components/layout/header";
import { parceriaBrutaData } from '@/lib/parceria-bruta-data';
import type { ParceriaBrutaDataRow } from '@/lib/types';

export default function ParceriaBrutaPage() {
  const [filter, setFilter] = useState('');

  const filteredData = useMemo(() => {
    if (!filter) {
      return parceriaBrutaData;
    }
    return parceriaBrutaData.filter((row: ParceriaBrutaDataRow) =>
      row.sku.toLowerCase().includes(filter.toLowerCase()) ||
      row.material.toLowerCase().includes(filter.toLowerCase())
    );
  }, [filter]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <Card className="animate-fade-in shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-headline text-2xl">Parceria Bruta</CardTitle>
              <Input
                type="search"
                placeholder="Buscar SKU ou Material..."
                className="w-full md:w-1/3"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="border rounded-md h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[150px]">SKU</TableHead>
                    <TableHead>MATERIAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.sku}</TableCell>
                        <TableCell>{row.material}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                        Nenhum resultado encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
