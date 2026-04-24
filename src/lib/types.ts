
export type DataRow = {
  remessa: string;
  data: string;
  br: string;
  cidade: string;
  cliente: string;
  ordem: string;
  qtdEtiqueta: number | string;
  nCaixas: string;
  parceria: string;
  linha?: string;
  notaFiscal?: string;
  totalRemessasCarro?: number;
};

export type ParceriaBrutaDataRow = {
  sku: string;
  material: string;
};
