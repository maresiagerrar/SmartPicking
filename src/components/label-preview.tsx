"use client";

import { DataRow } from "@/lib/types";
import { Button } from "./ui/button";
import { X, Printer } from "lucide-react";
import Barcode from 'react-barcode';

interface LabelPreviewProps {
  data: DataRow;
  onClose: () => void;
}

const BarcodePlaceholder = ({ value, width = 2, height = 50 }: { value: string, width?: number, height?: number }) => (
    <div className="flex flex-col items-center">
        <Barcode value={value} width={width} height={height} displayValue={false} margin={0} />
    </div>
);


export default function LabelPreview({ data, onClose }: LabelPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white text-black p-4 max-w-4xl mx-auto printable-area">
      <div className="flex justify-between items-center mb-4 non-printable">
        <h2 className="text-xl font-bold font-headline">Visualização da Etiqueta</h2>
        <div>
            <Button variant="outline" size="icon" onClick={handlePrint} className="mr-2">
                <Printer className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {/* Etiqueta */}
      <div className="border border-black relative font-mono" style={{ width: '831px', height: '480px'}}>
        
        {/* Vertical Line */}
        <div className="absolute top-[13px] left-[664px] h-[460px] w-[2px] bg-black"></div>
        {/* Horizontal Line */}
        <div className="absolute top-[219px] left-[16px] w-[631px] h-[2px] bg-black"></div>

        {/* Left-Top */}
        <div className="absolute top-[13px] left-[16px] w-[648px] h-[206px]">
            <p className="absolute top-[180px] left-0 text-3xl font-bold">{data.cidade} - {data.cliente}</p>
        </div>

        {/* Left-Bottom */}
        <div className="absolute top-[221px] left-[16px] w-[648px] h-[246px]">
             <div className="absolute top-[80px] left-[10px]">
                <p className="text-2xl font-bold text-center">Nº CAIXAS:</p>
                <p className="text-6xl font-bold text-center mt-2">{data.nCaixas}</p>
            </div>
             <div className="absolute top-[80px] left-[300px]">
                <p className="text-2xl font-bold text-center">ORDEM:</p>
                <p className="text-5xl font-bold text-center mt-2">{data.ordem}</p>
            </div>
             <div className="absolute top-[80px] right-[10px]">
                <p className="text-2xl font-bold text-center">QTD ETIQUETA:</p>
                <p className="text-6xl font-bold text-center mt-2">{data.qtdEtiqueta}</p>
            </div>
        </div>

        {/* Right Column */}
        <div className="absolute top-[13px] right-[10px] w-[150px] h-[460px] flex flex-col justify-between items-center text-center">
            <div className="w-full">
                <BarcodePlaceholder value={data.remessa} height={80} width={3} />
                <p className="text-sm font-semibold">{data.remessa}</p>
            </div>
            <div>
                <p className="text-5xl font-bold">{data.br}</p>
                <p className="text-5xl font-bold mt-8">{data.data}</p>
            </div>
            <div className="w-full">
                 <BarcodePlaceholder value={data.remessa} height={80} width={3}/>
            </div>
        </div>
      </div>
    </div>
  );
}
