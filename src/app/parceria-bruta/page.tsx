
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, PlusCircle, FileDown } from 'lucide-react';
import * as xlsx from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from '@/components/ui/label';
import Header from "@/components/layout/header";
import { parceriaBrutaData } from '@/lib/parceria-bruta-data';
import type { ParceriaBrutaDataRow } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

export default function ParceriaBrutaPage() {
  const [data, setData] = useState<ParceriaBrutaDataRow[]>(parceriaBrutaData);
  const [filter, setFilter] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddItem = () => {
    if (!newSku || !newMaterial) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha ambos os campos SKU e Material.",
        variant: "destructive",
      });
      return;
    }
    const newItem: ParceriaBrutaDataRow = {
      sku: newSku,
      material: newMaterial,
    };
    setData(prevData => [newItem, ...prevData]);
    setNewSku('');
    setNewMaterial('');
    setIsAddDialogOpen(false);
    toast({
      title: "Item Adicionado!",
      description: `O SKU ${newSku} foi adicionado com sucesso.`,
    });
  };

  const handleDeleteItem = (skuToDelete: string) => {
    setData(prevData => prevData.filter(row => row.sku !== skuToDelete));
    toast({
      title: "Item Removido!",
      description: `O SKU ${skuToDelete} foi removido.`,
      variant: "destructive",
    });
  };

  const filteredData = useMemo(() => {
    if (!filter) {
      return data;
    }
    return data.filter((row: ParceriaBrutaDataRow) =>
      row.sku.toLowerCase().includes(filter.toLowerCase()) ||
      row.material.toLowerCase().includes(filter.toLowerCase())
    );
  }, [filter, data]);

  const handleExport = () => {
    const header = ["SKU", "MATERIAL"];
    const body = filteredData.map(row => ({
      SKU: row.sku,
      MATERIAL: row.material,
    }));

    const worksheet = xlsx.utils.json_to_sheet(body, { header: header });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Parceria Bruta");

    // Auto-size columns
    const cols = Object.keys(body[0] || header).map(key => ({
        wch: body.reduce((w, r) => Math.max(w, String(r[key as keyof typeof r]).length), key.length) + 2
    }));
    worksheet["!cols"] = cols;
    
    xlsx.writeFile(workbook, "parceria_bruta.xlsx");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <Card className="animate-fade-in shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center gap-4">
              <CardTitle className="font-headline text-2xl">Parceria Bruta</CardTitle>
              <div className="flex items-center gap-2">
                 <Input
                    type="search"
                    placeholder="Buscar SKU ou Material..."
                    className="w-full md:w-64"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <Button onClick={handleExport} variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                       <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Adicionar SKU
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Item</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="sku" className="text-right">
                            SKU
                          </Label>
                          <Input
                            id="sku"
                            value={newSku}
                            onChange={(e) => setNewSku(e.target.value)}
                            className="col-span-3"
                            placeholder="ex: 50056558"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="material" className="text-right">
                            Material
                          </Label>
                          <Input
                            id="material"
                            value={newMaterial}
                            onChange={(e) => setNewMaterial(e.target.value)}
                            className="col-span-3"
                            placeholder="ex: RED BULL REGULAR 250ML"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                           <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleAddItem}>Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="border rounded-md h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[150px]">SKU</TableHead>
                    <TableHead>MATERIAL</TableHead>
                    <TableHead className="w-[100px] text-right">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((row) => (
                      <TableRow key={row.sku}>
                        <TableCell className="font-medium">{row.sku}</TableCell>
                        <TableCell>{row.material}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive-ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Excluir</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Essa ação não pode ser desfeita. Isso excluirá permanentemente o item
                                  <span className="font-bold"> {row.sku} - {row.material}</span>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem(row.sku)}>
                                  Sim, Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
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
