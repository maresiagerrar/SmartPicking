"use client";

import { useState } from "react";
import { DataRow } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Printer } from "lucide-react";
import Barcode from 'react-barcode';

interface LabelPreviewProps {
  data: DataRow;
  onClose: () => void;
}

export default function LabelPreview({ data, onClose }: LabelPreviewProps) {
  const PX_PER_MM = 3.77952756;
  const [widthInMm, setWidthInMm] = useState(107);
  const [heightInMm, setHeightInMm] = useState(60);
  
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
  
  const cliente = data.cliente || '';


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
        </div>
      </div>

      {/* Etiqueta */}
      <div className="border border-black relative font-mono bg-white flex text-black label-container overflow-hidden" style={{ width: `${widthInPx}px`, height: `${heightInPx}px`}}>
        
        {/* Left Section */}
        <div className="h-full flex flex-col justify-between items-center p-1 border-r border-black" style={{ width: '25%'}}>
            <div className="w-full flex-grow flex items-center justify-center overflow-hidden">
                 <div style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} className="flex flex-col items-center whitespace-nowrap">
                    <div className="bg-white px-2">
                      <Barcode value={data.remessa || 'N/A'} width={1} height={35} displayValue={false} background="white" />
                    </div>
                    <span className="text-xs font-semibold -mt-1" style={{letterSpacing: '1px'}}>{data.remessa}</span>
                </div>
            </div>
            <div className="flex flex-col items-center text-center -space-y-1">
                <span className="text-xs font-semibold">ORDEM</span>
                <span className="text-xl font-bold">{getOrderNumber()}</span>
                <span className="text-xs font-semibold mt-1">CAIXAS</span>
                <span className="text-lg font-bold">{data.nCaixas}</span>
            </div>
        </div>

        {/* Right Section */}
        <div className="h-full flex flex-col p-2 justify-between" style={{ width: '75%'}}>
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                  <span className="text-2xl font-bold">{data.data}</span>
                  <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">ORDEM:</span>
                      <span className="text-5xl font-bold">{getOrderNumber()}</span>
                  </div>
              </div>
              <div className="flex justify-between items-baseline -mt-6">
                  <span className="text-3xl font-bold">{data.br}</span>
                   <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">CAIXAS:</span>
                      <span className="text-2xl font-bold">{data.nCaixas}</span>
                  </div>
              </div>
               <div className="mt-2 text-lg font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                  <div>{cliente}</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center w-full -space-y-1">
                <div className="bg-white px-2">
                  <Barcode value={data.remessa || 'N/A'} width={2} height={40} displayValue={false} background="white" />
                </div>
                <span className="text-lg font-semibold tracking-widest -mt-1">{data.remessa}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
