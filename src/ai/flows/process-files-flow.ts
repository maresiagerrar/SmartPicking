
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

type TxtData = Omit<DataRow, 'cidade' | 'cliente' | 'nCaixas' | 'parceria'> & { qtdEtiqueta: number };
type ExcelData = Pick<DataRow, 'remessa' | 'cidade' | 'cliente'> & { sku: string };


function parseTxtFile(txtContent: string): TxtData[] {
    const txtData: TxtData[] = [];
    
    // Pre-process: remove page breaks and useless lines
    const cleanedContent = txtContent.replace(/\f/g, '').replace(/Doc\. Transp : \s*[\r\n]/g, '');
    const blocks = cleanedContent.split('Doc. Transp :').slice(1);

    let lastValidData = { remessa: 'N/A', data: 'N/A', br: 'N/A', ordem: 'N/A' };

    blocks.forEach(block => {
        const lines = block.split(/\r?\n/).filter(l => l.trim() !== '');
        
        let remessa = 'N/A';
        let data = 'N/A';
        let br = 'N/A';
        let ordem = 'N/A';
        let qtdEtiqueta = 0;
        
        const remLine = lines.find(l => l.includes('Rem :'));
        if (remLine) {
            const parts = remLine.split(/\s+/).filter(p => p.trim() !== '');
            const remIndex = parts.indexOf('Rem');
            if (remIndex !== -1 && parts.length > remIndex + 2) {
                remessa = parts[remIndex + 2] || 'N/A';
            }
            const dataIndex = parts.indexOf(remessa);
             if (dataIndex !== -1 && parts.length > dataIndex) {
                 const potentialDate = parts[dataIndex + 1];
                 if (/\d{2}\.\d{2}\.\d{4}/.test(potentialDate)) {
                    data = potentialDate;
                 }
            }
        }
        
        const ceLine = lines.find(l => l.includes('CE '));
        if (ceLine) {
            const ceParts = ceLine.split(/\s+/);
            const brPart = ceParts.find(p => p.startsWith('BR'));
            if (brPart) br = brPart;
        }

        const linhaLine = lines.find(l => l.includes('Linha :'));
        if (linhaLine) {
            const linhaParts = linhaLine.split('Linha :');
            if (linhaParts.length > 1 && linhaParts[1].trim()) {
                const linhaContent = linhaParts[1].trim().split(/\s+/);
                if (linhaContent.length > 1 && /^\d+$/.test(linhaContent[1])) {
                    ordem = linhaContent[1];
                } else if (/^\d+$/.test(linhaContent[0])) {
                    ordem = linhaContent[0];
                }
            }
        }
        
        const qtdCxIndex = lines.findIndex(l => l.trim().startsWith('Qtd Cx'));
        if (qtdCxIndex !== -1 && lines[qtdCxIndex + 1]) {
            const qtdCxText = lines[qtdCxIndex + 1].trim();
            const qtdCxMatch = qtdCxText.match(/^(\d+)/);
            if (qtdCxMatch) {
                qtdEtiqueta = parseInt(qtdCxMatch[1], 10) || 0;
            }
        }

        // Update last valid data if new data is found
        if (remessa !== 'N/A') lastValidData.remessa = remessa;
        if (data !== 'N/A') lastValidData.data = data;
        if (br !== 'N/A') lastValidData.br = br;
        if (ordem !== 'N/A') lastValidData.ordem = ordem;
        
        // Only push if we have a quantity, and use the last valid data if current is N/A
        if (qtdEtiqueta > 0) {
           txtData.push({ 
               remessa: remessa !== 'N/A' ? remessa : lastValidData.remessa,
               data: data !== 'N/A' ? data : lastValidData.data,
               br: br !== 'N/A' ? br : lastValidData.br,
               ordem: ordem !== 'N/A' ? ordem : lastValidData.ordem,
               qtdEtiqueta 
           });
        }
    });

    return txtData.filter(d => d.remessa !== 'N/A');
}


function parseExcelFile(excelContent: string): ExcelData[] {
    const excelData: ExcelData[] = [];
    try {
        const workbook = xlsx.read(Buffer.from(excelContent, 'base64'), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonSheet = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });

        jsonSheet.forEach((row: any) => {
          const remessa = row[0]; // Column A
          const skuH = row[7]; // Column H
          const skuI = row[8]; // Column I
          const skuM = row[12]; // Column M
          const cidadeColumn = row[10]; // Column K
          const clienteColumn = row[11]; // Column L
    
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
        throw new Error("Falha ao analisar o arquivo Excel.");
    }
    return excelData;
}

function insertAttentionRows(data: DataRow[]): DataRow[] {
    if (data.length === 0) return [];
    
    const result: DataRow[] = [];
    for (let i = 0; i < data.length; i++) {
        result.push(data[i]);
        const currentBr = data[i].br;
        const nextBr = data[i + 1]?.br;

        if (nextBr && nextBr.trim() !== '' && nextBr !== 'ATENÇÃO' && currentBr !== nextBr) {
             result.push({
                remessa: '', data: '', br: 'ATENÇÃO', cidade: '',
                cliente: `PROXIMO ${nextBr}`,
                ordem: '', qtdEtiqueta: '', nCaixas: '', parceria: '',
            });
        }
    }
    return result;
}


export async function processFiles(input: ProcessFilesInput): Promise<ProcessFilesOutput> {
    const txtData = parseTxtFile(input.txtContent);
    const excelData = parseExcelFile(input.excelContent);
    
    const parceriaSkuSet = new Set(parceriaBrutaData.map(item => item.sku));
    const excelDataMap = new Map<string, ExcelData[]>();
    excelData.forEach(item => {
        const existing = excelDataMap.get(item.remessa) || [];
        existing.push(item);
        excelDataMap.set(item.remessa, existing);
    });

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
      
      const qtdEtiquetasBase = txtItem.qtdEtiqueta > 0 ? txtItem.qtdEtiqueta : 0;
      const qtdEtiquetasParceria = parceriaItems.length;
      const totalEtiquetasRemessa = qtdEtiquetasBase + qtdEtiquetasParceria;
      const totalEtiquetasRemessaString = String(totalEtiquetasRemessa).padStart(2, '0');
      
      let currentCaixaCounter = 1;

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
            parceria: parceriaItems.length > 0 ? 'Sim' : 'Não',
        });
      }

      if (parceriaItems.length > 0) {
          parceriaItems.forEach((parceriaItem) => {
              let cliente = parceriaItem.cliente;
              if (clienteMapping[txtItem.br]) {
                  cliente = clienteMapping[txtItem.br];
              }

              tempParceriaData.push({
                  ...txtItem,
                  cidade: parceriaItem.cidade,
                  cliente: cliente,
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
