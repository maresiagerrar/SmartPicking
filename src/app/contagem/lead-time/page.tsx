"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, PlusCircle, FileDown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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
import { brLeadTimeData } from '@/lib/br-lead-time-data';
import type { BrLeadTimeDataRow } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = 'smartpicking_br_lead_time';

export default function BrLeadTimePage() {
  const [data, setData] = useState<BrLeadTimeDataRow[]>([]);
  const [filter, setFilter] = useState('');
  
  // States para Adicionar
  const [newBr, setNewBr] = useState('');
  const [newLeadTime, setNewLeadTime] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // States para Editar
  const [editingItem, setEditingItem] = useState<BrLeadTimeDataRow | null>(null);
  const [editLeadTime, setEditLeadTime] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { toast } = useToast();

  // Carregar dados iniciais do localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          setData(JSON.parse(stored));
        } catch (e) {
          setData(brLeadTimeData);
        }
      } else {
        setData(brLeadTimeData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(brLeadTimeData));
      }
    }
  }, []);

  // Salvar dados no localStorage sempre que forem alterados
  const saveToLocalStorage = (updatedData: BrLeadTimeDataRow[]) => {
    setData(updatedData);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
    }
  };

  const handleAddItem = () => {
    const formattedBr = newBr.trim().toUpperCase();
    const formattedLeadTime = newLeadTime.trim();

    if (!formattedBr || !formattedLeadTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha ambos os campos BR e LEAD TIME.",
        variant: "destructive",
      });
      return;
    }

    if (!formattedBr.startsWith('BR')) {
      toast({
        title: "Formato inválido",
        description: "O código da BR deve começar com 'BR' (Ex: BR198166).",
        variant: "destructive",
      });
      return;
    }

    // Verificar se já existe
    const exists = data.some(item => item.br === formattedBr);
    if (exists) {
      toast({
        title: "BR já cadastrada",
        description: `A BR ${formattedBr} já existe na lista. Se desejar alterar, utilize a opção de edição.`,
        variant: "destructive",
      });
      return;
    }

    const newItem: BrLeadTimeDataRow = {
      br: formattedBr,
      leadTime: formattedLeadTime,
    };

    const updated = [newItem, ...data];
    saveToLocalStorage(updated);
    setNewBr('');
    setNewLeadTime('');
    setIsAddDialogOpen(false);
    toast({
      title: "BR Adicionada!",
      description: `A BR ${formattedBr} com Lead Time de ${formattedLeadTime} foi adicionada com sucesso.`,
    });
  };

  const handleOpenEdit = (item: BrLeadTimeDataRow) => {
    setEditingItem(item);
    setEditLeadTime(item.leadTime);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    const formattedLeadTime = editLeadTime.trim();
    if (!formattedLeadTime) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o campo LEAD TIME.",
        variant: "destructive",
      });
      return;
    }

    const updated = data.map(item => {
      if (item.br === editingItem.br) {
        return { ...item, leadTime: formattedLeadTime };
      }
      return item;
    });

    saveToLocalStorage(updated);
    setIsEditDialogOpen(false);
    setEditingItem(null);
    toast({
      title: "BR Atualizada!",
      description: `O Lead Time da BR ${editingItem.br} foi alterado para ${formattedLeadTime}.`,
    });
  };

  const handleDeleteItem = (brToDelete: string) => {
    const updated = data.filter(row => row.br !== brToDelete);
    saveToLocalStorage(updated);
    toast({
      title: "BR Removida!",
      description: `A BR ${brToDelete} foi excluída da lista.`,
      variant: "destructive",
    });
  };

  const filteredData = useMemo(() => {
    if (!filter) {
      return data;
    }
    return data.filter((row: BrLeadTimeDataRow) =>
      row.br.toLowerCase().includes(filter.toLowerCase()) ||
      row.leadTime.toLowerCase().includes(filter.toLowerCase())
    );
  }, [filter, data]);

  const handleExport = () => {
    const header = ["BR", "LEAD TIME"];
    const body = filteredData.map(row => ({
      BR: row.br,
      "LEAD TIME": row.leadTime,
    }));

    const worksheet = xlsx.utils.json_to_sheet(body, { header: header });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Lead Times Contagem");

    // Auto-size columns
    const cols = Object.keys(body[0] || header).map(key => ({
        wch: body.reduce((w, r) => Math.max(w, String(r[key as keyof typeof r]).length), key.length) + 2
    }));
    worksheet["!cols"] = cols;
    
    xlsx.writeFile(workbook, "lead_times_contagem.xlsx");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto mb-6">
          <Link href="/contagem" passHref>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Contagem
            </Button>
          </Link>
        </div>

        <Card className="animate-fade-in shadow-lg max-w-5xl mx-auto">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-headline text-2xl">Cadastro de Lead Times de BR</CardTitle>
                <CardDescription>
                  Gerencie o tempo de entrega (Lead Time) de cada BR do hub Contagem para exibição nas etiquetas.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-end md:self-auto">
                  <Input
                    type="search"
                    placeholder="Buscar BR ou Lead Time..."
                    className="w-full md:w-64"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <Button onClick={handleExport} variant="outline" size="sm">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                       <Button size="sm" style={{ backgroundColor: '#FFCC00', color: '#000000' }} className="hover:bg-yellow-500 font-bold">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Adicionar BR
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Cadastrar Nova BR</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="br" className="text-right">
                            BR
                          </Label>
                          <Input
                            id="br"
                            value={newBr}
                            onChange={(e) => setNewBr(e.target.value)}
                            className="col-span-3"
                            placeholder="ex: BR198166"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="leadTime" className="text-right">
                            Lead Time
                          </Label>
                          <Input
                            id="leadTime"
                            value={newLeadTime}
                            onChange={(e) => setNewLeadTime(e.target.value)}
                            className="col-span-3"
                            placeholder="ex: 24 HRS"
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
            <ScrollArea className="border rounded-md h-[550px] w-full">
              <div className="min-w-full inline-block align-middle">
                <Table className="min-w-[600px]">
                  <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[200px]">CÓDIGO BR</TableHead>
                      <TableHead>LEAD TIME</TableHead>
                      <TableHead className="w-[150px] text-right">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length > 0 ? (
                      filteredData.map((row) => (
                        <TableRow key={row.br}>
                          <TableCell className="font-bold text-lg">{row.br}</TableCell>
                          <TableCell>
                            <span className="px-3 py-1 rounded bg-secondary text-secondary-foreground font-semibold text-sm">
                              {row.leadTime}
                            </span>
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenEdit(row)}
                              className="text-primary hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>

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
                                    Essa ação não pode ser desfeita. Isso excluirá permanentemente a
                                    <span className="font-bold"> {row.br} ({row.leadTime})</span> da base de dados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteItem(row.br)}>
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
                          Nenhuma BR encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* Dialog para Editar Lead Time */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Alterar Lead Time da BR {editingItem?.br}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-leadTime" className="text-right">
                Lead Time
              </Label>
              <Input
                id="edit-leadTime"
                value={editLeadTime}
                onChange={(e) => setEditLeadTime(e.target.value)}
                className="col-span-3"
                placeholder="ex: 48 HRS"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
