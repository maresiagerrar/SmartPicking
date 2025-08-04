
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

const ProcessFilesOutputSchema = z.array(DataRowSchema);
export type ProcessFilesOutput = z.infer<typeof ProcessFilesOutputSchema>;

export async function processFiles(input: ProcessFilesInput): Promise<ProcessFilesOutput> {
    // 1. Parse TXT file
    const txtData: Omit<DataRow, 'cidade' | 'cliente' | 'nCaixas' | 'qtdEtiqueta' | 'parceria'>[] & { qtdEtiqueta: number } = [];
    const txtLines = input.txtContent.split(/\r?\n/);
    
    txtLines.forEach(line => {
      if (line.startsWith('Rem :')) {
        const parts = line.split(/\s+/);
        const remessa = parts[2];
        const data = parts[3];
        
        let ordem = 'N/A';
        let qtdEtiqueta = 0;
        let br = 'N/A';

        const remessaLineIndex = txtLines.findIndex(l => l.trim() === line.trim());

        if (remessaLineIndex !== -1) {

          // Find "CE" line to get BR
          if (txtLines[remessaLineIndex + 1] && txtLines[remessaLineIndex + 1].includes('CE ')) {
            const ceParts = txtLines[remessaLineIndex + 1].split(/\s+/);
            const brPart = ceParts.find(p => p.startsWith('BR'));
            if(brPart) {
               br = brPart;
            }
          }
          
          // Find "Linha :" two lines below
          if (txtLines[remessaLineIndex + 2] && txtLines[remessaLineIndex + 2].includes('Linha :')) {
            const linhaParts = txtLines[remessaLineIndex + 2].split('Linha :');
            if(linhaParts.length > 1 && linhaParts[1].trim()) {
               const linhaContent = linhaParts[1].trim().split(/\s+/);
               if(linhaContent.length > 1) {
                  ordem = linhaContent[1]; 
               } else {
                  ordem = linhaContent[0];
               }
            }
          }

          // Find "Qtd Cx" and get the value from the next line
          let currentLineIndex = remessaLineIndex + 1;
          while(currentLineIndex < txtLines.length && !txtLines[currentLineIndex].startsWith('Rem :')) {
            if (txtLines[currentLineIndex].trim().startsWith('Qtd Cx')) {
                 if (txtLines[currentLineIndex + 1]) {
                    const qtdCxText = txtLines[currentLineIndex + 1].trim();
                    const qtdCxMatch = qtdCxText.match(/^(\d+)/);
                    if(qtdCxMatch) {
                       qtdEtiqueta = parseInt(qtdCxMatch[1], 10) || 0;
                    }
                 }
                 break; 
            }
            currentLineIndex++;
          }
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
        // Ensure raw option is false to get formatted text, and defval to handle empty cells
        const jsonSheet = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });

        jsonSheet.forEach((row: any) => {
          const remessa = row[0]; // Column A
          const sku = row[7]; // Column H
          const cidadeColumn = row[10];      // Column K
          const clienteColumn = row[11];   // Column L
    
          // Ensure remessa is always treated as a string and trimmed.
          if (remessa !== null && (cidadeColumn || clienteColumn)) {
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
        // If excel parsing fails, continue with just txt data.
    }
    
    // Create a Set of partnership SKUs for efficient lookup
    const parceriaSkuSet = new Set(parceriaBrutaData.map(item => item.sku));

    // 3. Merge data
    const mergedData: DataRow[] = [];
    const clienteMapping: Record<string, string> = {
      "BR495477": "SJBV - LEME",
      "BR495480": "SJBV - PIRASSUNUNGA",
      "BR495489": "SJBV - MOCOCA",
      "BR495491": "SJBV - SJ BOA VISTA",
      "BR495492": "SJBV - SJ RIO PARDO",
      "BR442154": "ITAPEVA",
      "BR442706": "ITAPEVA",
    };

    txtData.forEach((txtItem, index) => {
      // Find all matching entries in the Excel data for the current remessa
      const excelItems = excelData.filter(excel => excel.remessa === txtItem.remessa);
      
      const qtdEtiquetas = txtItem.qtdEtiqueta > 0 ? txtItem.qtdEtiqueta : 1;
      const totalEtiquetasString = String(qtdEtiquetas).padStart(2, '0');
      
      // Check if ANY of the SKUs for this remessa are in the partnership set
      const isParceria = excelItems.some(item => parceriaSkuSet.has(item.sku));
      const parceria = isParceria ? 'Sim' : 'Não';

      for (let i = 0; i < qtdEtiquetas; i++) {
        // Use the first excel item for general info, as it's often the same for a given remessa.
        const firstExcelItem = excelItems.length > 0 ? excelItems[0] : null;

        let cliente = firstExcelItem?.cliente || 'N/A';
        // Override cliente based on BR mapping
        if (clienteMapping[txtItem.br]) {
            cliente = clienteMapping[txtItem.br];
        }
        
        const baseItem = {
            ...txtItem,
            cidade: firstExcelItem?.cidade || 'N/A',
            cliente: cliente,
            qtdEtiqueta: qtdEtiquetas,
            parceria: parceria,
        };
        
        const nCaixas = `${String(i + 1).padStart(2, '0')}/${totalEtiquetasString}`;

        mergedData.push({
            ...baseItem,
            nCaixas: nCaixas,
        });
      }

      // Check if the next item has a different BR code and it's not the last item
      const nextTxtItem = txtData[index + 1];
      if (nextTxtItem && nextTxtItem.br !== txtItem.br) {
        mergedData.push({
            remessa: '',
            data: '',
            br: 'ATENÇÃO',
            cidade: '',
            cliente: `PROXIMO ${nextTxtItem.br}`,
            ordem: '',
            qtdEtiqueta: '',
            nCaixas: '',
            parceria: '',
        });
      }
    });

    return mergedData;
}
