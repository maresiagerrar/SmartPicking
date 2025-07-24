"use client";

import { useState } from "react";
import { DataRow } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
  const PX_PER_MM = 3.77952756;
  const [widthInMm, setWidthInMm] = useState(220);
  const [heightInMm, setHeightInMm] = useState(127);
  
  const handlePrint = () => {
    window.print();
  };

  const widthInPx = widthInMm * PX_PER_MM;
  const heightInPx = heightInMm * PX_PER_MM;

  return (
    <div className="bg-white text-black p-4 max-w-fit mx-auto printable-area">
      <div className="flex justify-between items-center mb-4 non-printable">
        <h2 className="text-xl font-bold font-headline">Visualização da Etiqueta</h2>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Label htmlFor="width-input">Largura (mm):</Label>
                <Input 
                    id="width-input" 
                    type="number" 
                    value={widthInMm} 
                    onChange={(e) => setWidthInMm(Number(e.target.value))}
                    className="w-20 h-8"
                />
            </div>
             <div className="flex items-center gap-2">
                <Label htmlFor="height-input">Altura (mm):</Label>
                <Input 
                    id="height-input" 
                    type="number" 
                    value={heightInMm} 
                    onChange={(e) => setHeightInMm(Number(e.target.value))}
                    className="w-20 h-8"
                />
            </div>
            <Button variant="outline" size="icon" onClick={handlePrint} className="mr-2">
                <Printer className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {/* Etiqueta */}
      <div className="border border-black relative font-mono bg-white" style={{ width: `${widthInPx}px`, height: `${heightInPx}px`}}>
        
        {/* Vertical Line */}
        <div className="absolute top-[13px] h-[calc(100%-20px)] w-[2px] bg-black" style={{left: 'calc(100% - 167px)'}}></div>
        {/* Horizontal Line */}
        <div className="absolute left-[16px] w-[calc(100%-184px)] h-[2px] bg-black" style={{top: '219px'}}></div>

        {/* Left-Top */}
        <div className="absolute top-[13px] left-[16px] h-[206px]" style={{width: 'calc(100% - 184px)'}}>
            <p className="absolute bottom-0 left-0 text-3xl font-bold">{data.cidade} - {data.cliente}</p>
        </div>

        {/* Left-Bottom */}
        <div className="absolute left-[16px] h-[calc(100%-228px)]" style={{top: '221px', width: 'calc(100% - 184px)'}}>
             <div className="absolute top-1/2 -translate-y-1/2 left-[10px] text-center">
                <p className="text-2xl font-bold">Nº CAIXAS:</p>
                <p className="text-6xl font-bold mt-2">{data.nCaixas}</p>
            </div>
             <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-center">
                <p className="text-2xl font-bold">ORDEM:</p>
                <p className="text-5xl font-bold mt-2">{data.ordem}</p>
            </div>
             <div className="absolute top-1/2 -translate-y-1/2 right-[10px] text-center">
                <p className="text-2xl font-bold">QTD ETIQUETA:</p>
                <p className="text-6xl font-bold mt-2">{String(data.qtdEtiqueta).padStart(2, '0')}</p>
            </div>
        </div>

        {/* Right Column */}
        <div className="absolute top-[13px] right-[10px] w-[150px] h-[calc(100%-20px)] flex flex-col justify-between items-center text-center">
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
