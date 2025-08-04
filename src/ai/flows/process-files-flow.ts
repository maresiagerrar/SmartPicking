
'use server';
/**
 * @fileOverview Processes uploaded text and Excel files to extract structured data.
 *
 * - processFiles - A function that handles the file processing logic.
 * - ProcessFilesInput - The input type for the processFiles function.
 * - ProcessFilesOutput - The return type for the processFiles function (an array of DataRow).
 */

import { z } from 'zod';
import * as xlsx from 'xlsx';
import { DataRow } from '@/lib/types';
import { parceriaBrutaData } from '@/lib/parceria-bruta-data';

const ProcessFilesInputSchema = z.object({
  txtContent: z.string().describe('The content of the uploaded TXT file.'),
  excelContent: z.string().describe('The Base64 encoded content of the uploaded Excel file.'),
});
export type ProcessFilesInput = z.infer<typeof ProcessFilesInputSchema>;

const DataRowSchema = z.object({
  remessa: z.string(),
  data: z.string(),
  br: z.string(),
  cidade: z.string(),
  cliente: z.string(),
  ordem: z.string(),
  qtdEtiqueta: z.union([z.number(), z.string()]),
  nCaixas: z.string(),
  parceria: z.string(),
});

const ProcessFilesOutputSchema = z.object({
    mainData: z.array(DataRowSchema),
    parceriaData: z.array(DataRowSchema)
});
export type ProcessFilesOutput = z.infer<typeof ProcessFilesOutputSchema>;

function insertAttentionRows(data: DataRow[]): DataRow[] {
    if (data.length === 0) return [];
    
    const result: DataRow[] = [];
    for (let i = 0; i < data.length; i++) {
        result.push(data[i]);
        const currentBr = data[i].br;
        const nextBr = data[i + 1]?.br;

        // Check if the next item exists, has a non-empty br, is not an attention row, and has a different br code
        if (nextBr && nextBr.trim() !== '' && nextBr !== 'ATENÇÃO' && currentBr !== nextBr) {
             result.push({
                remessa: '',
                data: '',
                br: 'ATENÇÃO',
                cidade: '',
                cliente: `PROXIMO ${nextBr}`,
                ordem: '',
                qtdEtiqueta: '',
                nCaixas: '',
                parceria: '',
            });
        }
    }
    return result;
}


export async function processFiles(input: ProcessFilesInput): Promise<ProcessFilesOutput> {
    // 1. Parse TXT file
    const txtData: Omit<DataRow, 'cidade' | 'cliente' | 'nCaixas' | 'parceria'>[] & { qtdEtiqueta: number }[] = [];
    const txtLines = input.txtContent.split(/\r?\n/);
    
    txtLines.forEach((line, index) => {
      if (line.trim().startsWith('Rem :')) {
        const parts = line.split(/\s+/);
        const remessa = parts[2];
        const data = parts[3];
        
        let ordem = 'N/A';
        let qtdEtiqueta = 0;
        let br = 'N/A';

        // Search for details within the block of lines for this "Remessa"
        let currentIndex = index + 1;
        while(currentIndex < txtLines.length && !txtLines[currentIndex].trim().startsWith('Rem :')) {
          const currentLine = txtLines[currentIndex].trim();

          // Find "CE" line to get BR
          if (currentLine.includes('CE ')) {
            const ceParts = currentLine.split(/\s+/);
            const brPart = ceParts.find(p => p.startsWith('BR'));
            if(brPart) {
               br = brPart;
            }
          }
          
          // Find "Linha :" to get Ordem
          if (currentLine.includes('Linha :')) {
            const linhaParts = currentLine.split('Linha :');
            if(linhaParts.length > 1 && linhaParts[1].trim()) {
               const linhaContent = linhaParts[1].trim().split(/\s+/);
               // The order number can be the first or second element after "Linha :"
               if(linhaContent.length > 1 && /^\d+$/.test(linhaContent[1])) {
                  ordem = linhaContent[1]; 
               } else if (/^\d+$/.test(linhaContent[0])) {
                  ordem = linhaContent[0];
               }
            }
          }

          // Find "Qtd Cx" and get the value from the next line
          if (currentLine.startsWith('Qtd Cx')) {
             if (txtLines[currentIndex + 1]) {
                const qtdCxText = txtLines[currentIndex + 1].trim();
                const qtdCxMatch = qtdCxText.match(/^(\d+)/);
                if(qtdCxMatch) {
                   qtdEtiqueta = parseInt(qtdCxMatch[1], 10) || 0;
                }
             }
          }
          currentIndex++;
        }
        
        txtData.push({ remessa, data, br, ordem, qtdEtiqueta });
      }
    });

    // 2. Parse Excel file
    const excelData: Pick<DataRow, 'remessa' | 'cidade' | 'cliente'> & { sku: string }[] = [];
    try {
        const workbook = xlsx.read(Buffer.from(input.excelContent, 'base64'), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonSheet = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });

        jsonSheet.forEach((row: any) => {
          const remessa = row[0]; // Column A
          const skuH = row[7]; // Column H
          const skuI = row[8]; // Column I
          const skuM = row[12]; // Column M
          const cidadeColumn = row[10];      // Column K
          const clienteColumn = row[11];   // Column L
    
          if (remessa !== null && (cidadeColumn || clienteColumn)) {
            const sku = skuM || skuI || skuH; 
            excelData.push({
              remessa: String(remessa).trim(),
              sku: sku ? String(sku).trim() : 'N/A',
              cidade: cidadeColumn ? String(cidadeColumn) : 'N/A',
              cliente: clienteColumn ? String(clienteColumn) : 'N/A',
            });
          }
        });
    } catch(e) {
        console.error("Error parsing excel file", e);
    }
    
    // Create a Set of partnership SKUs for efficient lookup
    const parceriaSkuSet = new Set(parceriaBrutaData.map(item => item.sku));
    
    // Create a Map from Excel data for efficient lookup
    const excelDataMap = new Map<string, (Pick<DataRow, 'cidade' | 'cliente'> & { sku: string })[]>();
    excelData.forEach(item => {
        const existing = excelDataMap.get(item.remessa) || [];
        existing.push(item);
        excelDataMap.set(item.remessa, existing);
    });

    // 3. Merge data
    const tempMainData: DataRow[] = [];
    const tempParceriaData: DataRow[] = [];

    const clienteMapping: Record<string, string> = {
      "BR495477": "SJBV - LEME",
      "BR495480": "SJBV - PIRASSUNUNGA",
      "BR495489": "SJBV - MOCOCA",
      "BR495491": "SJBV - SJ BOA VISTA",
      "BR495492": "SJBV - SJ RIO PARDO",
      "BR442154": "ITAPEVA",
      "BR442706": "ITAPEVA",
    };

    txtData.forEach((txtItem) => {
      const excelItems = excelDataMap.get(txtItem.remessa) || [];
      const parceriaItems = excelItems.filter(item => parceriaSkuSet.has(item.sku) && item.cliente !== 'N/A');
      const isParceria = parceriaItems.length > 0;
      
      const qtdEtiquetasBase = txtItem.qtdEtiqueta > 0 ? txtItem.qtdEtiqueta : 0;
      const qtdEtiquetasParceria = parceriaItems.length;
      const totalEtiquetasRemessa = qtdEtiquetasBase + qtdEtiquetasParceria;
      const totalEtiquetasRemessaString = String(totalEtiquetasRemessa).padStart(2, '0');
      
      let currentCaixaCounter = 1;

      // Generate base labels for the main list
      for (let i = 0; i < qtdEtiquetasBase; i++) {
        const firstExcelItem = excelItems.length > 0 ? excelItems[0] : null;

        let cliente = firstExcelItem?.cliente || 'N/A';
        if (clienteMapping[txtItem.br]) {
            cliente = clienteMapping[txtItem.br];
        }
        
        tempMainData.push({
            ...txtItem,
            cidade: firstExcelItem?.cidade || 'N/A',
            cliente: cliente,
            qtdEtiqueta: totalEtiquetasRemessa,
            nCaixas: `${String(currentCaixaCounter++).padStart(2, '0')}/${totalEtiquetasRemessaString}`,
            parceria: isParceria ? 'Sim' : 'Não',
        });
      }

      // Generate partnership labels for the separate partnership list
      if (isParceria) {
          parceriaItems.forEach((parceriaItem) => {
              tempParceriaData.push({
                  ...txtItem,
                  cidade: parceriaItem.cidade,
                  cliente: parceriaItem.cliente,
                  qtdEtiqueta: totalEtiquetasRemessa,
                  nCaixas: `${String(currentCaixaCounter++).padStart(2, '0')}/${totalEtiquetasRemessaString}`,
                  parceria: "Sim",
              });
          });
      }
    });

    const mainData = insertAttentionRows(tempMainData);
    const parceriaData = insertAttentionRows(tempParceriaData);

    return { mainData, parceriaData };
}
