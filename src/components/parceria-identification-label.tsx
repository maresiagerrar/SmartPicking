
"use client";

import { Button } from "./ui/button";
import { Printer, X, ChevronLeft, ChevronRight } from "lucide-react";
import Barcode from 'react-barcode';

export type IdentificationData = {
  fornecimento: string;
  cidade: string;
  recebedor: string;
  material: string;
  denominacao: string;
  qtd: string | number;
  localidade: string;
  linha: string;
};

interface ParceriaIdentificationLabelProps {
  data: IdentificationData;
  onClose: () => void;
  onNavigate?: (direction: 'next' | 'prev') => void;
  currentIndex?: number;
  totalItems?: number;
}

export default function ParceriaIdentificationLabel({ 
  data, 
  onClose, 
  onNavigate,
  currentIndex,
  totalItems
}: ParceriaIdentificationLabelProps) {
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white text-black min-h-screen flex flex-col items-center p-4">
      {/* Controls - Non Printable */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 bg-muted p-4 rounded-lg border non-printable shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Fechar Visualização
          </Button>
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

      {/* A4 Page Container */}
      <div className="printable-area bg-white border shadow-2xl overflow-hidden flex flex-col font-sans" 
           style={{ 
             width: '210mm', 
             height: '297mm', 
             padding: '20mm',
             boxSizing: 'border-box'
           }}>
        
        {/* Header - City & Line */}
        <div className="flex justify-between items-start border-b-4 border-black pb-8 mb-12">
          <div className="flex-1">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 mb-2">Cidade / Destino</h2>
            <h1 className="text-6xl font-black uppercase leading-none">{data.cidade || 'N/A'}</h1>
          </div>
          <div className="text-right ml-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 mb-2">Linha</h2>
            <h1 className="text-7xl font-black">{data.linha || '-'}</h1>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-grow space-y-12">
          {/* Receiver */}
          <section>
            <h2 className="text-xl font-bold uppercase tracking-widest text-gray-600 mb-4 border-b border-gray-300 pb-2">Recebedor da Mercadoria</h2>
            <p className="text-4xl font-bold leading-tight">{data.recebedor || 'N/A'}</p>
          </section>

          {/* Material / SKU */}
          <section>
            <h2 className="text-xl font-bold uppercase tracking-widest text-gray-600 mb-4 border-b border-gray-300 pb-2">Material / Produto</h2>
            <div className="flex justify-between items-baseline">
              <p className="text-3xl font-bold flex-1 pr-8">{data.denominacao || 'N/A'}</p>
              <p className="text-2xl font-mono bg-gray-100 px-4 py-1 rounded">SKU: {data.material}</p>
            </div>
          </section>

          {/* Quantity and Localidade */}
          <div className="grid grid-cols-2 gap-12">
            <section>
              <h2 className="text-xl font-bold uppercase tracking-widest text-gray-600 mb-4 border-b border-gray-300 pb-2">Quantidade (UDC)</h2>
              <p className="text-8xl font-black text-center py-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                {data.qtd} <span className="text-2xl font-normal">UN</span>
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold uppercase tracking-widest text-gray-600 mb-4 border-b border-gray-300 pb-2">Localidade</h2>
              <div className="flex flex-col h-full justify-center">
                <p className="text-3xl font-bold text-center leading-tight">{data.localidade || 'N/A'}</p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer - Barcode & Fornecimento */}
        <div className="mt-auto border-t-4 border-black pt-12 flex flex-col items-center space-y-4">
          <div className="bg-white p-4">
            <Barcode 
              value={data.fornecimento || '0000000000'} 
              width={3} 
              height={100} 
              displayValue={false} 
              background="white" 
            />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600">Número do Fornecimento</h2>
            <p className="text-4xl font-black tracking-[0.2em]">{data.fornecimento}</p>
          </div>
          <div className="w-full flex justify-between pt-8 text-xs font-bold text-gray-400 uppercase tracking-tighter">
            <span>Smart Picking System</span>
            <span>Documento de Identificação de Parceria Bruta</span>
            <span>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @media print {
          .printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 20mm !important;
            width: 210mm !important;
            height: 297mm !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
