"use client";

import { Printer, X, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export type SummaryItem = {
  material: string;
  denominacao: string;
  qtd: number;
};

interface ParceriaSummaryLabelProps {
  items: SummaryItem[];
  onClose?: () => void;
  hub: string;
}

export default function ParceriaSummaryLabel({ 
  items, 
  onClose, 
  hub 
}: ParceriaSummaryLabelProps) {
  
  const handlePrint = () => {
    window.print();
  };

  const totalQtd = items.reduce((acc, item) => acc + item.qtd, 0);

  return (
    <div className="bg-white text-black flex flex-col items-center w-full flex-1">
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 bg-muted p-4 rounded-lg border non-printable shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
          )}
          <span className="text-sm font-bold uppercase text-primary">Resumo Geral de Itens</span>
        </div>
        
        <Button onClick={handlePrint} style={{ backgroundColor: '#D40511' }}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Resumo A4
        </Button>
      </div>

      <div className="printable-area bg-white border shadow-sm print:shadow-none print:border-none flex flex-col font-sans" 
           style={{ 
             width: '210mm', 
             minHeight: '297mm',
             padding: '15mm',
             boxSizing: 'border-box',
             backgroundColor: 'white'
           }}>
        
        <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-6">
          <div>
            <h1 className="text-4xl font-black uppercase leading-tight">RESUMO GERAL</h1>
            <p className="text-xl font-bold text-gray-600">HUB: {hub.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <FileText className="h-12 w-12 ml-auto mb-2 text-primary" />
            <p className="text-sm font-bold text-gray-500 uppercase">Total de Materiais: {items.length}</p>
          </div>
        </div>

        <div className="flex-grow space-y-6">
          <section className="flex-grow">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2 border-b-2 border-black pb-1">Consolidação Total de Itens no Arquivo</h2>
            <div className="border-2 border-black rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-100 border-b-2 border-black">
                        <tr>
                            <th className="p-2 text-left text-xs font-black uppercase border-r border-black">SKU</th>
                            <th className="p-2 text-left text-xs font-black uppercase border-r border-black">Descrição do Material</th>
                            <th className="p-2 text-right text-xs font-black uppercase">Qtd Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-300 last:border-0 hover:bg-gray-50">
                                <td className="p-2 text-sm font-mono border-r border-gray-300">{item.material}</td>
                                <td className="p-2 text-sm font-bold uppercase leading-tight border-r border-gray-300">{item.denominacao}</td>
                                <td className="p-2 text-xl font-black text-right">{item.qtd}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-black">
                        <tr>
                            <td colSpan={2} className="p-2 text-right font-black uppercase text-sm border-r border-black">Soma Total de Todos os Itens:</td>
                            <td className="p-2 text-2xl font-black text-right">{totalQtd}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
          </section>
        </div>

        <div className="mt-8 border-t-4 border-black pt-4 flex justify-between text-[10px] font-bold text-gray-400 uppercase">
          <span>Smart Picking System - Relatório de Conferência Geral</span>
          <span>{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
}