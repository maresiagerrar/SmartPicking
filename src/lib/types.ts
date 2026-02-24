
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
  notaFiscal?: string;
};

export type ParceriaBrutaDataRow = {
  sku: string;
  material: string;
};
