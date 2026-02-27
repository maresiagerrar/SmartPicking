"use client";

import { Button } from "./ui/button";
import { Printer, X, ChevronLeft, ChevronRight } from "lucide-react";
import Barcode from 'react-barcode';
import { cn } from "@/lib/utils";

export type IdentificationItem = {
  material: string;
  denominacao: string;
  qtd: number;
};

export type IdentificationData = {
  fornecimento: string;
  cidade: string;
  recebedor: string;
  items: IdentificationItem[];
  localidade: string;
  linha: string;
};

interface ParceriaIdentificationLabelProps {
  data: IdentificationData;
  onClose?: () => void;
  onNavigate?: (direction: 'next' | 'prev') => void;
  currentIndex?: number;
  totalItems?: number;
  hideControls?: boolean;
}

export default function ParceriaIdentificationLabel({ 
  data, 
  onClose, 
  onNavigate,
  currentIndex,
  totalItems,
  hideControls = false
}: ParceriaIdentificationLabelProps) {
  
  const handlePrint = () => {
    window.print();
  };

  const totalQtd = data.items.reduce((acc, item) => acc + item.qtd, 0);

  return (
    <div className={cn(
      "bg-white text-black flex flex-col items-center",
      !hideControls && "min-h-screen p-4",
      hideControls && "page-break"
    )}>
      {/* Controls - Non Printable */}
      {!hideControls && (
        <div className="w-full max-w-4xl flex justify-between items-center mb-6 bg-muted p-4 rounded-lg border non-printable shadow-sm">
          <div className="flex items-center gap-4">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />
                Fechar Visualização
              </Button>
            )}
            {currentIndex !== undefined && totalItems !== undefined && (
              <span className="text-sm font-medium">
                Item {currentIndex + 1} de {totalItems}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onNavigate && (
              <>
                <Button variant="outline" size="icon" onClick={() => onNavigate('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => onNavigate('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button onClick={handlePrint} style={{ backgroundColor: '#D40511' }} className="ml-4">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir A4
            </Button>
          </div>
        </div>
      )}

      {/* A4 Page Container */}
      <div className="printable-area bg-white border shadow-sm print:shadow-none overflow-hidden flex flex-col font-sans" 
           style={{ 
             width: '210mm', 
             height: '297mm', 
             padding: '15mm',
             boxSizing: 'border-box',
             backgroundColor: 'white'
           }}>
        
        {/* Header - City & Line */}
        <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
          <div className="flex-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Cidade / Destino</h2>
            <h1 className="text-5xl font-black uppercase leading-tight">{data.cidade || 'N/A'}</h1>
          </div>
          <div className="text-right ml-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Linha</h2>
            <h1 className="text-6xl font-black">{data.linha || '-'}</h1>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-grow space-y-6">
          {/* Receiver */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1 border-b border-gray-200 pb-1">Recebedor</h2>
            <p className="text-2xl font-bold leading-tight">{data.recebedor || 'N/A'}</p>
          </section>

          {/* Items Table for Conference */}
          <section className="flex-grow">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2 border-b-2 border-black pb-1">Conferência de Itens (Parceria Bruta)</h2>
            <div className="border-2 border-black rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-100 border-b-2 border-black">
                        <tr>
                            <th className="p-2 text-left text-xs font-black uppercase border-r border-black">SKU</th>
                            <th className="p-2 text-left text-xs font-black uppercase border-r border-black">Descrição do Material</th>
                            <th className="p-2 text-right text-xs font-black uppercase">Qtd</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-400 last:border-0">
                                <td className="p-2 text-sm font-mono border-r border-gray-400">{item.material}</td>
                                <td className="p-2 text-sm font-bold uppercase leading-tight border-r border-gray-400">{item.denominacao}</td>
                                <td className="p-2 text-xl font-black text-right">{item.qtd}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-black">
                        <tr>
                            <td colSpan={2} className="p-2 text-right font-black uppercase text-sm border-r border-black">Total Geral da Remessa:</td>
                            <td className="p-2 text-2xl font-black text-right">{totalQtd}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
          </section>

          {/* Localidade */}
          <section>
             <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1 border-b border-gray-200 pb-1">Localidade de Separação</h2>
             <p className="text-2xl font-bold">{data.localidade || 'N/A'}</p>
          </section>
        </div>

        {/* Footer - Barcode & Fornecimento */}
        <div className="mt-auto border-t-4 border-black pt-8 flex flex-col items-center space-y-2">
          <div className="bg-white p-2">
            <Barcode 
              value={data.fornecimento || '0000000000'} 
              width={3} 
              height={80} 
              displayValue={false} 
              background="white" 
            />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Número do Fornecimento</h2>
            <p className="text-4xl font-black tracking-[0.2em]">{data.fornecimento}</p>
          </div>
          <div className="w-full flex justify-between pt-4 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
            <span>Smart Picking System</span>
            <span>Documento de Identificação de Parceria Bruta</span>
            <span>{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @media print {
          .printable-area {
            position: static !important;
            display: block !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
