export interface CmfRegistryFixture {
  name: string;
  aliases: string[];
  licenseType: string;
  snapshotDate: string;
  sourceUrl: string;
}

export const CMF_REGISTRY_FIXTURES: CmfRegistryFixture[] = [
  {
    name: 'BancoEstado',
    aliases: ['banco estado', 'bancoestado', 'banco del estado de chile'],
    licenseType: 'Banco fiscalizado por CMF',
    snapshotDate: '2026-05-06',
    sourceUrl: 'https://www.cmfchile.cl/institucional/estadisticas/seg_rgpsf.php',
  },
  {
    name: 'Banco Santander Chile',
    aliases: ['santander', 'banco santander', 'santander chile'],
    licenseType: 'Banco fiscalizado por CMF',
    snapshotDate: '2026-05-06',
    sourceUrl: 'https://www.cmfchile.cl/institucional/estadisticas/seg_rgpsf.php',
  },
  {
    name: 'Scotiabank Chile',
    aliases: ['scotiabank', 'scotia'],
    licenseType: 'Banco fiscalizado por CMF',
    snapshotDate: '2026-05-06',
    sourceUrl: 'https://www.cmfchile.cl/institucional/estadisticas/seg_rgpsf.php',
  },
  {
    name: 'Coopeuch',
    aliases: ['coopeuch', 'cooperativa coopeuch'],
    licenseType: 'Cooperativa fiscalizada por CMF',
    snapshotDate: '2026-05-06',
    sourceUrl: 'https://www.cmfchile.cl/institucional/estadisticas/seg_rgpsf.php',
  },
  {
    name: 'Tenpo Prepago S.A.',
    aliases: ['tenpo', 'tenpo prepago'],
    licenseType: 'Emisor de tarjetas de pago con provision de fondos',
    snapshotDate: '2026-05-06',
    sourceUrl: 'https://www.cmfchile.cl/institucional/estadisticas/seg_rgpsf.php',
  },
];
