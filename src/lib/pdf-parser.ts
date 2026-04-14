import * as pdfjsLib from 'pdfjs-dist';

// Define worker source for the browser using the unpkg CDN
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface ColumnText {
  page: number;
  column: number;
  text: string;
}

interface DocumentData {
  doc_transp?: string;
  rem_number?: string;
  rem_date?: string;
  ce_zn?: string;
  br_code?: string;
  pdv?: string;
  linha?: string;
  position?: string;
  type?: string;
  products?: string[];
  cigarettes?: string;
  qtd_cx?: string;
}

export async function convertPdfToTxt(pdfBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const allColumnTexts: ColumnText[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    const colWidth = viewport.width / 3;
    const cols: any[][] = [[], [], []];

    for (const item of textContent.items) {
      if ('str' in item && 'transform' in item) {
        const x = item.transform[4];
        const y = item.transform[5];
        if (x < colWidth) cols[0].push({ ...item, x, y });
        else if (x < colWidth * 2) cols[1].push({ ...item, x, y });
        else cols[2].push({ ...item, x, y });
      }
    }

    for (let col = 0; col < 3; col++) {
      cols[col].sort((a, b) => {
        // Sort by y descending, then x ascending
        // Give a 3pt threshold leeway for lines that aren't perfectly aligned
        if (Math.abs(b.y - a.y) > 4) {
          return b.y - a.y;
        }
        return a.x - b.x;
      });

      let colText = '';
      let lastY = -1;

      for (let i = 0; i < cols[col].length; i++) {
        const item = cols[col][i];
        if (lastY !== -1 && Math.abs(item.y - lastY) > 4) {
          colText += '\n';
        } else if (lastY !== -1 && item.str.trim()) {
           // We might want to space it logically if horizontal distance is big, but let's stick to 1 space
          colText += ' '; 
        }
        colText += item.str;
        lastY = item.y;
      }

      if (colText.trim()) {
        allColumnTexts.push({
          page: pageNum,
          column: col + 1,
          text: colText,
        });
      }
    }
  }

  const groupedDocuments = groupMultiPageDocuments(allColumnTexts);
  const allDocuments: DocumentData[] = [];

  for (const docText of groupedDocuments) {
    const doc = parseColumnDocument(docText);
    if (doc && isValidDocument(doc)) {
      allDocuments.push(doc);
    }
  }

  const formattedDocs = allDocuments.map(formatDocumentOutput);
  return formattedDocs.join('\n');
}

function groupMultiPageDocuments(columnTexts: ColumnText[]): string[] {
  const documentsDict: { [key: string]: string } = {};

  for (const colData of columnTexts) {
    const text = colData.text;
    const docMatch = text.match(/Doc\.\s*Transp\s*:?\s*(\d{6})/i);
    const remMatch = text.match(/Rem\s*:?\s*(\d{10})/i);

    if (docMatch && remMatch) {
      const docKey = `${docMatch[1]}_${remMatch[1]}`;
      if (documentsDict[docKey]) {
        documentsDict[docKey] += '\n' + text;
      } else {
        documentsDict[docKey] = text;
      }
    } else if (docMatch) {
      const docTransp = docMatch[1];
      const existingKey = Object.keys(documentsDict).find(k => k.startsWith(`${docTransp}_`));
      if (existingKey) {
        documentsDict[existingKey] += '\n' + text;
      } else {
        documentsDict[`${docTransp}_temp_${Object.keys(documentsDict).length}`] = text;
      }
    } else {
      const keys = Object.keys(documentsDict);
      if (keys.length > 0) {
        const lastKey = keys[keys.length - 1];
        documentsDict[lastKey] += '\n' + text;
      }
    }
  }

  return Object.values(documentsDict);
}

function parseColumnDocument(text: string): DocumentData | null {
  if (!text || !text.trim()) return null;

  const doc: DocumentData = {};

  const docMatch = text.match(/Doc\.\s*Transp\s*:?\s*(\d{6})/i);
  if (docMatch) {
    doc.doc_transp = docMatch[1];
  } else {
    return null;
  }

  const remMatch = text.match(/Rem\s*:?\s*(\d{10})\s+(\d{2}\.\d{2}\.\d{4})/i);
  if (remMatch) {
    doc.rem_number = remMatch[1];
    doc.rem_date = remMatch[2];
  }

  const ceMatch1 = text.match(/CE\s+ZN\s+(\d{4})\s+(BR\d{6})/i);
  const ceMatch2 = text.match(/CE\s+ZN\s+(\d{7})\s+(BR\d{6})/i);
  const ceMatch3 = text.match(/CE\s+(\d{4})\s+(BR\d{6})\s+ZN\s+(\d{3})/i);

  if (ceMatch1) {
    doc.ce_zn = ceMatch1[1];
    doc.br_code = ceMatch1[2];
  } else if (ceMatch2) {
    doc.ce_zn = ceMatch2[1];
    doc.br_code = ceMatch2[2];
  } else if (ceMatch3) {
    doc.ce_zn = ceMatch3[3] + ceMatch3[1];
    doc.br_code = ceMatch3[2];
  }

  const pdvMatch1 = text.match(/PDV\s+(\d{9})\s+Linha\s*:?\s*(ON\d+)\s+(\d+)\s+([PV])/i);
  const pdvMatch2 = text.match(/PDV\s+Linha\s*:?\s*(ON\d+)\s+(\d+)\s+([PV])/i);

  if (pdvMatch1) {
    doc.pdv = pdvMatch1[1];
    doc.linha = pdvMatch1[2];
    doc.position = pdvMatch1[3];
    doc.type = pdvMatch1[4];
  } else if (pdvMatch2) {
    doc.pdv = "";
    doc.linha = pdvMatch2[1];
    doc.position = pdvMatch2[2];
    doc.type = pdvMatch2[3];
  }

  doc.products = extractProductsFromColumnText(text);

  const cigMatch = text.match(/(\d+[,\.]\d+)\s+CIGARETTES/i);
  if (cigMatch) {
    doc.cigarettes = cigMatch[1];
  } else {
    doc.cigarettes = "";
  }

  doc.qtd_cx = extractQtdCxFromText(text);

  return doc;
}

function extractProductsFromColumnText(text: string): string[] {
  const products: string[] = [];
  const lines = text.split('\n');
  let inProductsSection = false;

  for (let line of lines) {
    line = line.trim();

    if (line.includes('Qtd Marcas')) {
      inProductsSection = true;
      continue;
    }

    if (line.includes('Qtd Cx') && !/\d+[,\.]?\d*\s+\d{8}/.test(line)) {
      inProductsSection = false;
      continue;
    }

    const productMatch = line.match(/^(\d+[,\.]?\d*)\s+(\d{8})\s+(.+)/);

    if (productMatch && (inProductsSection || (!line.includes('Doc. Transp') && !line.includes('Rem :')))) {
      const quantity = productMatch[1];
      const code = productMatch[2];
      const description = productMatch[3].replace(/\n/g, ' ').replace(/\r/g, '').trimEnd();

      const productLine = `${quantity} ${code} ${description}`;
      if (description.length > 2 && !products.includes(productLine)) {
        products.push(productLine);
      }
    }
  }

  return products;
}

function extractQtdCxFromText(text: string): string {
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Qtd Cx')) {
      const sameLineMatch = lines[i].match(/Qtd\s+Cx\s+(\d+)/i);
      if (sameLineMatch) return sameLineMatch[1];
      
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (/^\d+$/.test(nextLine)) {
          return nextLine;
        }
      }
    }
  }

  let cigFound = false;
  for (const line of lines) {
    if (line.includes('CIGARETTES')) {
      cigFound = true;
    } else if (cigFound && /^\d+$/.test(line.trim())) {
      return line.trim();
    }
  }

  return "1";
}

function isValidDocument(doc: DocumentData): boolean {
  return !!(doc && doc.doc_transp && doc.rem_number && doc.rem_date);
}

function formatDocumentOutput(doc: DocumentData): string {
  const lines: string[] = [];
  lines.push(`Doc. Transp : ${doc.doc_transp}`);
  lines.push(`Rem : ${doc.rem_number} ${doc.rem_date}`);

  if (doc.ce_zn && doc.br_code) {
    lines.push(`CE ZN ${doc.ce_zn} ${doc.br_code}`);
  }

  if (doc.linha && doc.position) {
    const docType = doc.type || 'P';
    if (doc.pdv) {
      lines.push(`PDV ${doc.pdv} Linha : ${doc.linha} ${doc.position} ${docType}`);
    } else {
      lines.push(`PDV Linha : ${doc.linha} ${doc.position} ${docType}`);
    }
  }

  lines.push("Qtd Marcas ");
  if (doc.products) lines.push(...doc.products);

  if (doc.cigarettes) {
    lines.push(`${doc.cigarettes} CIGARETTES`);
  } else {
    lines.push("CIGARETTES");
  }

  lines.push("Qtd Cx ");
  lines.push(doc.qtd_cx || '1');

  return lines.join('\n') + '\n';
}
