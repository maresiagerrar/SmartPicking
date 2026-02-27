
"use client";

import { Button } from "./ui/button";
import { X, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
  dataEntrega: string;
  items: IdentificationItem[];
  localidade: string;
  linha: string;
  carro: string;
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
  
  const totalQtd = data.items.reduce((acc, item) => acc + item.qtd, 0);

  return (
    <div className={cn(
      "bg-white text-black flex flex-col items-center",
      !hideControls && "w-full flex-1",
      hideControls && "page-break identification-page-container"
    )}>
      {!hideControls && (
        <div className="w-full max-w-4xl flex justify-between items-center mb-6 bg-muted p-4 rounded-lg border non-printable shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />
                Fechar
              </Button>
            )}
            {currentIndex !== undefined && totalItems !== undefined && (
              <span className="text-sm font-medium text-black">
                Página {currentIndex + 1} de {totalItems}
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
          </div>
        </div>
      )}

      <div className="printable-area bg-white border shadow-sm print:shadow-none print:border-none overflow-hidden flex flex-col font-sans" 
           style={{ 
             width: '210mm', 
             minHeight: '297mm', 
             height: hideControls ? '297mm' : 'auto',
             padding: '15mm',
             boxSizing: 'border-box',
             backgroundColor: 'white'
           }}>
        
        <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
          <div className="flex-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Cidade / Destino</h2>
            <h1 className="text-5xl font-black uppercase leading-tight mb-2">{data.cidade || 'N/A'}</h1>
            <div className="flex items-center gap-2 text-2xl font-bold bg-gray-100 w-fit px-3 py-1 rounded">
              <Calendar className="h-6 x-6" />
              <span>DATA ENTREGA: {data.dataEntrega || '-'}</span>
            </div>
          </div>
          <div className="text-right ml-4 max-w-[45%] flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-0.5">Carro (R)</h2>
              <h1 className="text-4xl font-black leading-none">{data.carro || '-'}</h1>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-0.5">Linha (T)</h2>
              <h1 className="text-4xl font-black leading-none text-wrap break-all">{data.linha || '-'}</h1>
            </div>
          </div>
        </div>

        <div className="flex-grow space-y-6 overflow-hidden">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1 border-b border-gray-200 pb-1">Recebedor</h2>
            <p className="text-2xl font-bold leading-tight">{data.recebedor || 'N/A'}</p>
          </section>

          <section className="flex-grow overflow-hidden">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2 border-b-2 border-black pb-1">Conferência de Itens Unificados por CE</h2>
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
                        {data.items.slice(0, 18).map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-400 last:border-0">
                                <td className="p-2 text-sm font-mono border-r border-gray-400">{item.material}</td>
                                <td className="p-2 text-sm font-bold uppercase leading-tight border-r border-gray-400">{item.denominacao}</td>
                                <td className="p-2 text-xl font-black text-right">{item.qtd}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-black">
                        <tr>
                            <td colSpan={2} className="p-2 text-right font-black uppercase text-sm border-r border-black">Total Unificado do CE:</td>
                            <td className="p-2 text-2xl font-black text-right">{totalQtd}</td>
                        </tr>
                    </tfoot>
                </table>
                {data.items.length > 18 && (
                  <div className="p-1 bg-yellow-50 text-[10px] text-center font-bold">
                    * Lista limitada aos primeiros 18 itens na visualização impressa.
                  </div>
                )}
            </div>
          </section>

          <section>
             <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1 border-b border-gray-200 pb-1">Localidade de Separação</h2>
             <p className="text-2xl font-bold">{data.localidade || 'N/A'}</p>
          </section>
        </div>

        <div className="mt-auto border-t-4 border-black pt-4 flex flex-col items-center space-y-2">
          <div className="bg-white p-1">
            <Barcode 
              value={data.fornecimento || '0000000000'} 
              width={2} 
              height={60} 
              displayValue={false} 
              background="white" 
            />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">CÓDIGO CE (IDENTIFICAÇÃO)</h2>
            <p className="text-3xl font-black tracking-normal text-center">{data.fornecimento}</p>
          </div>
          <div className="w-full flex justify-between pt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
            <span>Smart Picking System</span>
            <span>Identificação Unificada por CE/Data</span>
            <span>{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
