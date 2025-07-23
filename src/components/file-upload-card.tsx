"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, FileSpreadsheet, UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface FileUploadCardProps {
  onProcess: (txtFile: File, excelFile: File) => void;
  isLoading: boolean;
}

interface FileUploadAreaProps {
  icon: React.ReactNode;
  title: string;
  acceptedFiles: string;
  file: File | null;
  setFile: (file: File | null) => void;
  id: string;
}

function FileUploadArea({ icon, title, acceptedFiles, file, setFile, id }: FileUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const fileExtension = "." + selectedFile.name.split('.').pop()?.toLowerCase();
      if (!acceptedFiles.split(',').includes(fileExtension!)) {
        toast({
          title: "Tipo de arquivo inválido",
          description: `Por favor, selecione um arquivo do tipo: ${acceptedFiles}`,
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };
  
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300",
        isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/50",
        file && "border-green-500 bg-green-500/10"
      )}
      onClick={() => inputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Input
        ref={inputRef}
        type="file"
        id={id}
        className="hidden"
        accept={acceptedFiles}
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileChange(e.target.files)}
      />
      {file ? (
        <div className="text-center text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-12 h-12 mx-auto" />
          <p className="mt-2 font-semibold text-lg">{title}</p>
          <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
          <Button variant="link" size="sm" className="mt-2 text-green-700 dark:text-green-400" onClick={(e) => { e.stopPropagation(); setFile(null)}}>Remover</Button>
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          {icon}
          <p className="mt-2 font-semibold text-lg">{title}</p>
          <p className="text-sm">Arraste e solte ou clique para selecionar</p>
        </div>
      )}
    </div>
  );
}

export default function FileUploadCard({ onProcess, isLoading }: FileUploadCardProps) {
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleProcessClick = () => {
    if (!txtFile || !excelFile) {
       toast({
        title: "Arquivos Faltando",
        description: "Por favor, faça o upload de ambos os arquivos para processar.",
        variant: "destructive",
      });
      return;
    }
    onProcess(txtFile, excelFile);
  };

  return (
    <Card className="w-full animate-fade-in-up shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">1. Fazer Upload dos Arquivos</CardTitle>
        <CardDescription>
          Selecione o arquivo de texto (.txt) e o arquivo Excel (.xlsx, .xlsm) para iniciar o processamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <FileUploadArea
          id="txt-upload"
          icon={<FileText className="w-12 h-12 text-primary/70" />}
          title="Arquivo de Texto"
          acceptedFiles=".txt"
          file={txtFile}
          setFile={setTxtFile}
        />
        <FileUploadArea
          id="excel-upload"
          icon={<FileSpreadsheet className="w-12 h-12 text-primary/70" />}
          title="Arquivo Excel"
          acceptedFiles=".xlsx,.xlsm"
          file={excelFile}
          setFile={setExcelFile}
        />
      </CardContent>
      <CardFooter>
        <Button onClick={handleProcessClick} disabled={isLoading || !txtFile || !excelFile} className="w-full md:w-auto ml-auto" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            'Processar Arquivos'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
