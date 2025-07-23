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
  linha: z.string(),
  qtdEtiqueta: z.number(),
  sequencia: z.number(),
});

const ProcessFilesOutputSchema = z.array(DataRowSchema);
export type ProcessFilesOutput = z.infer<typeof ProcessFilesOutputSchema>;

export async function processFiles(input: ProcessFilesInput): Promise<ProcessFilesOutput> {
    // 1. Parse TXT file
    const txtData: Omit<DataRow, 'br' | 'cidade' | 'cliente'>[] = [];
    const txtLines = input.txtContent.split(/\r?\n/);
    
    txtLines.forEach(line => {
      if (line.startsWith('Rem :')) {
        const parts = line.split(/\s+/);
        const remessa = parts[2];
        const data = parts[3];
        
        let linha = 'N/A';
        let qtdEtiqueta = 0;

        const remessaLineIndex = txtLines.findIndex(l => l.trim() === line.trim());

        if (remessaLineIndex !== -1) {
          // Find "Linha :" two lines below
          if (txtLines[remessaLineIndex + 2] && txtLines[remessaLineIndex + 2].includes('Linha :')) {
            const linhaParts = txtLines[remessaLineIndex + 2].split('Linha :');
            if(linhaParts.length > 1) {
               linha = linhaParts[1].trim().split(/\s+/).slice(0, 2).join(' ');
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
        
        txtData.push({ remessa, data, linha, qtdEtiqueta, sequencia: 0 }); // Sequence will be updated later
      }
    });

    // 2. Parse Excel file
    const excelData: Pick<DataRow, 'remessa' | 'br' | 'cidade' | 'cliente'>[] = [];
    try {
        const workbook = xlsx.read(Buffer.from(input.excelContent, 'base64'), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonSheet = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

        jsonSheet.forEach((row: any) => {
          const remessa = row[0]; // Column A
          const br = row[10];      // Column K
          const cidade = row[11];   // Column L
          const cliente = row[12];  // Column M
    
          if (remessa && (br || cidade || cliente)) {
            excelData.push({
              remessa: String(remessa).trim(),
              br: br ? String(br) : 'N/A',
              cidade: cidade ? String(cidade) : 'N/A',
              cliente: cliente ? String(cliente) : 'N/A',
            });
          }
        });
    } catch(e) {
        console.error("Error parsing excel file", e);
        // If excel parsing fails, continue with just txt data.
    }


    // 3. Merge data
    const mergedData: DataRow[] = [];
    let sequenceCounter = 1;

    txtData.forEach(txtItem => {
      const excelItem = excelData.find(excel => excel.remessa === txtItem.remessa);
      if (excelItem) {
        mergedData.push({
          ...txtItem,
          ...excelItem,
          sequencia: sequenceCounter++,
        });
      } else {
         mergedData.push({
          ...txtItem,
          br: 'N/A',
          cidade: 'N/A',
          cliente: 'N/A',
          sequencia: sequenceCounter++,
        });
      }
    });
    
    return mergedData;
}
