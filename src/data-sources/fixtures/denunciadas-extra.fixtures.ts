export interface DenouncedEntityFixture {
  name: string;
  aliases: string[];
  motivo: string;
  source: string;
  _mocked: boolean;
}

export const DENUNCIADAS_EXTRA_FIXTURES: DenouncedEntityFixture[] = [
  {
    name: 'Lucas Facil',
    aliases: ['lucas facil', 'lucas fácil', 'lucasfacil', 'lucas facil app'],
    motivo: 'oferta de creditos rapidos con identidad financiera no verificable',
    source: 'Dataset complementario de demo basado en patron de alertas CMF 2025',
    _mocked: true,
  },
  {
    name: 'CrediExpress Chile',
    aliases: ['crediexpress', 'credi express chile', 'crediexpress chile'],
    motivo: 'uso de nombre comercial similar a entidad financiera',
    source: 'Dataset complementario de demo basado en patron de alertas CMF 2025',
    _mocked: true,
  },
  {
    name: 'Prestamo Seguro 24',
    aliases: ['prestamo seguro 24', 'prestamo seguro', 'préstamo seguro 24'],
    motivo: 'solicitud de pagos anticipados para liberar credito',
    source: 'Dataset complementario de demo basado en patron de alertas CMF 2025',
    _mocked: true,
  },
  {
    name: 'Finanzas Cordillera App',
    aliases: ['finanzas cordillera', 'finanzas cordillera app'],
    motivo: 'posible imitacion de servicios financieros regulados',
    source: 'Dataset complementario de demo basado en patron de alertas CMF 2025',
    _mocked: true,
  },
  {
    name: 'Credito Rapido Sur',
    aliases: ['credito rapido sur', 'crédito rápido sur'],
    motivo: 'captacion irregular y promesa de aprobacion inmediata',
    source: 'Dataset complementario de demo basado en patron de alertas CMF 2025',
    _mocked: true,
  },
];
