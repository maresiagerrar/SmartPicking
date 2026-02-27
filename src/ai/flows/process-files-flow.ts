'use server';
/**
 * @fileOverview Processes uploaded text and Excel files to extract structured data.
 *
 * - processFiles - A function that handles the file processing logic.
 * - ProcessFilesInput - The input type for the processFiles function.
 * - ProcessFilesOutput - The return type for the processFiles function.
 */

import { z } from 'zod';
import * as xlsx from 'xlsx';
import { DataRow } from '@/lib/types';
import { parceriaBrutaData } from '@/lib/parceria-bruta-data';

const ProcessFilesInputSchema = z.object({
  txtContent: z.string().describe('The content of the uploaded TXT file.'),
  excelContent: z.string().describe('The Base64 encoded content of the uploaded Excel file.'),
  shipTrackerContent: z.string().optional().describe('The Base64 encoded content of the Ship Tracker Excel file.'),
  hub: z.enum(['campinas', 'contagem']).optional().default('campinas'),
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
  linha: z.string().optional(),
  notaFiscal: z.string().optional(),
});

const ProcessFilesOutputSchema = z.object({
    mainData: z.array(DataRowSchema),
    parceriaData: z.array(DataRowSchema)
});
export type ProcessFilesOutput = z.infer<typeof ProcessFilesOutputSchema>;

type TxtData = Omit<DataRow, 'cidade' | 'cliente' | 'nCaixas' | 'parceria' | 'linha' | 'notaFiscal'> & { qtdEtiqueta: number };
type ExcelData = Pick<DataRow, 'remessa' | 'cidade' | 'cliente'> & { sku: string; linha?: string };

/**
 * Normaliza o número da remessa removendo zeros à esquerda e espaços.
 */
function normalizeRemessa(rem: string): string {
    return String(rem).trim().replace(/^0+/, '');
}

function parseTxtFile(txtContent: string): TxtData[] {
    const txtData: TxtData[] = [];
    const cleanContent = txtContent.replace(/\f/g, '\n').replace(/Doc\. Transp\s*:\s*\r?\n/gi, '');
    const lines = cleanContent.split(/\r?\n/);
    
    let currentRemessa = 'N/A';
    let currentData = 'N/A';
    let currentBr = 'N/A';
    let currentOrdem = 'N/A';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const remMatch = line.match(/Rem\s*:\s*(\d+)/i);
        if (remMatch) currentRemessa = remMatch[1];
        
        const dateMatch = line.match(/(\d{2}\.\d{2}\.\d{4})/);
        if (dateMatch) currentData = dateMatch[1];

        const brMatch = line.match(/BR\d+/i);
        if (brMatch) currentBr = brMatch[0].toUpperCase();

        const ordemMatch = line.match(/Linha\s*[:\.]?\s*(\w+)?\s*(\d+)/i);
        if (ordemMatch) currentOrdem = ordemMatch[2];

        if (line.toUpperCase().startsWith('QTD CX')) {
            let qtd = 0;
            const sameLineMatch = line.match(/Qtd Cx\s+(\d+)/i);
            const nextLineMatch = lines[i + 1]?.trim().match(/^(\d+)/);

            if (sameLineMatch) qtd = parseInt(sameLineMatch[1], 10);
            else if (nextLineMatch) qtd = parseInt(nextLineMatch[1], 10);

            if (qtd > 0 && currentRemessa !== 'N/A') {
                txtData.push({
                    remessa: currentRemessa,
                    data: currentData,
                    br: currentBr,
                    ordem: currentOrdem,
                    qtdEtiqueta: qtd
                });
            }
        }
    }
    return txtData;
}

function parseExcelFile(excelContent: string): ExcelData[] {
    const excelData: ExcelData[] = [];
    try {
        const workbook = xlsx.read(Buffer.from(excelContent, 'base64'), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonSheet = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });

        jsonSheet.forEach((row: any) => {
          const remessa = row[0];
          const skuH = row[7];
          const skuI = row[8];
          const skuM = row[12];
          const cidadeColumn = row[10];
          const clienteColumn = row[11];
          const linhaColumn = row[19]; // Coluna T
    
          if (remessa !== null && (cidadeColumn || clienteColumn)) {
            const sku = skuM || skuI || skuH; 
            excelData.push({
              remessa: String(remessa).trim(),
              sku: sku ? String(sku).trim() : 'N/A',
              cidade: cidadeColumn ? String(cidadeColumn) : 'N/A',
              cliente: clienteColumn ? String(clienteColumn) : 'N/A',
              linha: linhaColumn ? String(linhaColumn).trim() : undefined,
            });
          }
        });
    } catch(e) {
        throw new Error("Falha ao analisar o arquivo Excel.");
    }
    return excelData;
}

function parseShipTracker(content: string): Map<string, string> {
    const mapping = new Map<string, string>();
    try {
        const workbook = xlsx.read(Buffer.from(content, 'base64'), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonSheet = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });

        jsonSheet.forEach((row: any, index: number) => {
            if (index === 0) return; // Header
            const remessa = row[1]; // Coluna B (Fornecimento)
            const notaFiscal = row[6]; // Coluna G (Nota Fiscal Number)
            if (remessa && notaFiscal) {
                mapping.set(normalizeRemessa(String(remessa)), String(notaFiscal).trim());
            }
        });
    } catch(e) {
        console.error("Erro ao ler Ship Tracker:", e);
    }
    return mapping;
}

function insertAttentionRows(data: DataRow[]): DataRow[] {
    if (data.length === 0) return [];
    const result: DataRow[] = [];
    for (let i = 0; i < data.length; i++) {
        result.push(data[i]);
        const nextBr = data[i + 1]?.br;
        if (nextBr && nextBr.trim() !== '' && nextBr !== 'ATENÇÃO' && data[i].br !== nextBr) {
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
    const txtDataRaw = parseTxtFile(input.txtContent);
    const excelDataRaw = parseExcelFile(input.excelContent);
    const shipTrackerMap = input.shipTrackerContent ? parseShipTracker(input.shipTrackerContent) : new Map<string, string>();
    
    // Consolidação de remessas do TXT
    const aggregatedTxtMap = new Map<string, TxtData>();
    txtDataRaw.forEach(item => {
        const normRem = normalizeRemessa(item.remessa);
        if (aggregatedTxtMap.has(normRem)) {
            const existing = aggregatedTxtMap.get(normRem)!;
            existing.qtdEtiqueta += item.qtdEtiqueta;
        } else {
            aggregatedTxtMap.set(normRem, { ...item });
        }
    });
    const txtData = Array.from(aggregatedTxtMap.values());

    const parceriaSkuSet = new Set(parceriaBrutaData.map(item => item.sku));
    
    // Agrupa dados do Excel por remessa normalizada
    const excelDataMap = new Map<string, ExcelData[]>();
    excelDataRaw.forEach(item => {
        const normRem = normalizeRemessa(item.remessa);
        const existing = excelDataMap.get(normRem) || [];
        existing.push(item);
        excelDataMap.set(normRem, existing);
    });

    const tempMainData: DataRow[] = [];
    const tempParceriaData: DataRow[] = [];

    const hubMappings: Record<string, Record<string, string>> = {
      campinas: {
        "BR495477": "SJBV - LEME",
        "BR495480": "SJBV - PIRASSUNUNGA",
        "BR495489": "SJBV - MOCOCA",
        "BR495491": "SJBV - SJ BOA VISTA",
        "BR495492": "SJBV - SJ RIO PARDO",
        "BR442154": "ITAPEVA",
        "BR442706": "ITAPEVA",
      },
      contagem: {}
    };

    const clienteMapping = hubMappings[input.hub || 'campinas'] || {};
    const parceriaText = input.hub === 'contagem' ? 'ESTA REMESSA POSSUI PARCERIA' : 'Sim';

    txtData.forEach((txtItem) => {
      const normRem = normalizeRemessa(txtItem.remessa);
      const excelItems = excelDataMap.get(normRem) || [];
      const parceriaItems = excelItems.filter(item => parceriaSkuSet.has(item.sku) && item.cliente !== 'N/A');
      
      const qtdEtiquetasBase = txtItem.qtdEtiqueta > 0 ? txtItem.qtdEtiqueta : 0;
      const totalEtiquetasRemessa = qtdEtiquetasBase + parceriaItems.length;
      const totalEtiquetasRemessaString = String(totalEtiquetasRemessa).padStart(2, '0');
      const notaFiscal = shipTrackerMap.get(normRem);
      const linhaInfo = excelItems.length > 0 ? excelItems[0].linha : undefined;
      
      let currentCaixaCounter = 1;

      for (let i = 0; i < qtdEtiquetasBase; i++) {
        const firstExcelItem = excelItems.length > 0 ? excelItems[0] : null;
        let cliente = firstExcelItem?.cliente || 'N/A';
        if (clienteMapping[txtItem.br] && cliente.toUpperCase() === 'SOUZA CRUZ LTDA.') {
            cliente = clienteMapping[txtItem.br];
        }
        
        tempMainData.push({
            ...txtItem,
            cidade: firstExcelItem?.cidade || 'N/A',
            cliente: cliente,
            qtdEtiqueta: totalEtiquetasRemessa,
            nCaixas: `${String(currentCaixaCounter++).padStart(2, '0')}/${totalEtiquetasRemessaString}`,
            parceria: parceriaItems.length > 0 ? parceriaText : 'Não',
            linha: linhaInfo,
            notaFiscal: notaFiscal,
        });
      }

      parceriaItems.forEach((parceriaItem) => {
          let cliente = parceriaItem.cliente;
          if (clienteMapping[txtItem.br] && cliente.toUpperCase() === 'SOUZA CRUZ LTDA.') {
              cliente = clienteMapping[txtItem.br];
          }

          tempParceriaData.push({
              ...txtItem,
              cidade: parceriaItem.cidade,
              cliente: cliente,
              qtdEtiqueta: totalEtiquetasRemessa,
              nCaixas: `${String(currentCaixaCounter++).padStart(2, '0')}/${totalEtiquetasRemessaString}`,
              parceria: parceriaText,
              linha: parceriaItem.linha,
              notaFiscal: notaFiscal,
          });
      });
    });

    return { 
        mainData: insertAttentionRows(tempMainData), 
        parceriaData: insertAttentionRows(tempParceriaData) 
    };
}
