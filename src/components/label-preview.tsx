"use client";

import { DataRow } from "@/lib/types";
import { Button } from "./ui/button";
import { X, Printer } from "lucide-react";
import Barcode from 'react-barcode';

interface LabelPreviewProps {
  data: DataRow;
  onClose: () => void;
}

const BarcodePlaceholder = ({ value }: { value: string }) => (
    <div className="flex flex-col items-center">
        <Barcode value={value} height={50} displayValue={false} margin={0} />
    </div>
);


export default function LabelPreview({ data, onClose }: LabelPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white text-black p-4 max-w-3xl mx-auto printable-area">
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
      <div className="border-2 border-black relative" style={{ width: '800px', height: '400px'}}>
        {/* Main content */}
        <div className="absolute top-0 left-0 p-4 w-full h-full">
          <div className="grid grid-cols-12 gap-2 h-full">

            {/* Left Column */}
            <div className="col-span-8 border-r-2 border-black pr-4 flex flex-col justify-between">
                <div>
                    <p className="text-2xl font-bold">{data.cidade} - {data.cliente}</p>
                </div>
                <div className="flex justify-between items-end">
                    <div className="text-center">
                        <p className="text-xl font-bold">Nº CAIXAS:</p>
                        <p className="text-5xl font-bold">{data.nCaixas}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold">ORDEM:</p>
                        <p className="text-3xl font-bold">{data.ordem}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold">QTD ETIQUETA:</p>
                        <p className="text-5xl font-bold">{data.qtdEtiqueta}</p>
                    </div>
                </div>
            </div>

            {/* Right Column */}
            <div className="col-span-4 flex flex-col justify-between items-center text-center">
                <div className="w-full">
                    <BarcodePlaceholder value={data.remessa} />
                    <p className="text-sm font-semibold">{data.remessa}</p>
                </div>
                <div>
                    <p className="text-4xl font-bold">{data.br}</p>
                    <p className="text-4xl font-bold mt-4">{data.data}</p>
                </div>
                <div className="w-full">
                    <BarcodePlaceholder value={data.remessa} />
                </div>
            </div>
          </div>
          {/* Border line */}
          <div className="absolute bottom-1/2 left-4 w-[calc(66%-2rem)] border-t-2 border-black"></div>
        </div>
      </div>
    </div>
  );
}
