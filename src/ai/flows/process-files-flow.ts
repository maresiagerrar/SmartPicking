'use server';
/**
 * @fileOverview Processes uploaded text and Excel files to extract structured data.
 *
 * - processFiles - A function that handles the file processing logic.
 * - ProcessFilesInput - The input type for the processFiles function.
 * - ProcessFilesOutput - The return type for the processFiles function (an array of DataRow).
 */

import { ai } from '@/ai/genkit';
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
  return processFilesFlow(input);
}

const processFilesFlow = ai.defineFlow(
  {
    name: 'processFilesFlow',
    inputSchema: ProcessFilesInputSchema,
    outputSchema: ProcessFilesOutputSchema,
  },
  async (input) => {
    // 1. Parse TXT file
    const txtData: Omit<DataRow, 'br' | 'cidade' | 'cliente'>[] = [];
    const txtLines = input.txtContent.split(/\r?\n/);
    let currentSequence = 1;
    
    txtLines.forEach(line => {
      if (line.startsWith('Rem :')) {
        const parts = line.split(/\s+/);
        const remessa = parts[2];
        const data = parts[3];
        
        let linha = 'N/A';
        let qtdEtiqueta = 0;

        const linhaIndex = txtLines.findIndex(l => l.includes(`Rem : ${remessa}`) && l.includes(data));

        if (linhaIndex !== -1) {
          const pdvLine = txtLines[linhaIndex + 2];
           if (pdvLine && pdvLine.includes('Linha :')) {
             const linhaParts = pdvLine.split('Linha :');
             if(linhaParts.length > 1) {
                linha = linhaParts[1].trim().split(/\s+/).slice(0, 2).join(' ');
             }
           }

          let qtdCxLineIndex = linhaIndex + 3;
          while(qtdCxLineIndex < txtLines.length && !txtLines[qtdCxLineIndex].startsWith('Qtd Cx')) {
            qtdCxLineIndex++;
          }
           if (qtdCxLineIndex < txtLines.length && txtLines[qtdCxLineIndex + 1]) {
             qtdEtiqueta = parseInt(txtLines[qtdCxLineIndex + 1].trim(), 10) || 0;
           }
        }
        
        txtData.push({ remessa, data, linha, qtdEtiqueta, sequencia: 0 }); // Sequence will be updated later
      }
    });

    // 2. Parse Excel file
    const excelData: Pick<DataRow, 'remessa' | 'br' | 'cidade' | 'cliente'>[] = [];
    const workbook = xlsx.read(Buffer.from(input.excelContent, 'base64'), { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonSheet = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    jsonSheet.forEach((row: any) => {
      // Assuming Remessa is in Col A, BR in Col K, Cliente in Col L
      const remessa = row[0]; // Column A
      const br = row[10];      // Column K
      const cidade = row[11];   // Column L
      const cliente = row[12];  // Assuming Cliente is in Column M next to cidade, as it's not specified.
                                // If Cliente is from a different column, this needs adjustment.

      if (remessa && (br || cidade || cliente)) {
        excelData.push({
          remessa: String(remessa).trim(),
          br: br ? String(br) : 'N/A',
          cidade: cidade ? String(cidade) : 'N/A',
          cliente: cliente ? String(cliente) : 'N/A',
        });
      }
    });

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
);
