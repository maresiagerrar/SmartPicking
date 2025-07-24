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

const BarcodePlaceholder = ({ value, width = 2, height = 50, vertical = false }: { value: string, width?: number, height?: number, vertical?: boolean }) => (
    <div className={`flex flex-col items-center ${vertical ? 'rotate-180' : ''}`}>
        <Barcode 
            value={value} 
            width={width} 
            height={height} 
            displayValue={false} 
            margin={0} 
        />
    </div>
);


export default function LabelPreview({ data, onClose }: LabelPreviewProps) {
  const PX_PER_MM = 3.77952756;
  const [widthInMm, setWidthInMm] = useState(100);
  const [heightInMm, setHeightInMm] = useState(50);
  
  const handlePrint = () => {
    window.print();
  };

  const widthInPx = widthInMm * PX_PER_MM;
  const heightInPx = heightInMm * PX_PER_MM;

  const getOrderNumber = () => {
      if (typeof data.ordem === 'string' && data.ordem.includes('/')) {
          return data.ordem.split('/')[0];
      }
      return data.ordem;
  }

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
      <div className="border border-black relative font-mono bg-white flex" style={{ width: `${widthInPx}px`, height: `${heightInPx}px`}}>
        
        {/* Left Section */}
        <div className="h-full flex flex-col items-center p-1 border-r border-black" style={{ width: '25%'}}>
            <div className="flex-grow w-full flex items-center justify-center">
                <div style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} className="flex flex-col items-center">
                    <Barcode value={data.remessa} width={1.5} height={40} displayValue={false} />
                    <span className="text-xs -mt-1">{data.remessa}</span>
                </div>
            </div>
            <div className="flex flex-col items-center text-center -mt-4">
                <span className="text-xs font-semibold">ORDEM</span>
                <span className="text-xl font-bold">{getOrderNumber()}</span>
                <span className="text-xs font-semibold mt-2">CAIXAS</span>
                <span className="text-lg font-bold">{data.nCaixas}</span>
            </div>
        </div>

        {/* Right Section */}
        <div className="h-full flex flex-col p-2" style={{ width: '75%'}}>
            <div className="flex justify-between items-start">
                <span className="text-3xl font-bold">{data.data}</span>
                <div className="flex items-baseline">
                    <span className="text-lg font-semibold mr-2">ORDEM:</span>
                    <span className="text-5xl font-bold">{getOrderNumber()}</span>
                </div>
            </div>
            <div className="flex justify-between items-baseline mt-1">
                <span className="text-4xl font-bold">{data.br}</span>
                 <div className="flex items-baseline">
                    <span className="text-lg font-semibold mr-2">CAIXAS:</span>
                    <span className="text-3xl font-bold">{data.nCaixas}</span>
                </div>
            </div>
             <div className="mt-2">
                <span className="text-lg font-bold">{data.cliente}</span>
            </div>
            <div className="flex-grow"></div>
            <div className="flex flex-col items-center w-full">
                <Barcode value={data.remessa} width={2.5} height={50} displayValue={false}/>
                <span className="text-xl font-semibold tracking-wider">{data.remessa}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
