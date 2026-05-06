import { AnalysisResultDto } from '../dto/analysis-result.dto';
import { CreateAnalysisDto, Scenario } from '../dto/create-analysis.dto';

type FixtureWithoutRuntime = Omit<AnalysisResultDto, 'id' | 'meta'>;

const COMMON_AGENT_RUNS: AnalysisResultDto['agentRuns'] = [
  { agent: 'intake', model: 'fixture-haiku-4-5', durationMs: 120, status: 'warn' },
  { agent: 'regulatory', model: 'fixture-legal-chile', durationMs: 80, status: 'warn' },
  { agent: 'risk', model: 'fixture-sonnet-4-6', durationMs: 160, status: 'warn' },
  { agent: 'recommendation', model: 'fixture-sonnet-4-6', durationMs: 140, status: 'warn' },
  { agent: 'validator', model: 'fixture-haiku-4-5', durationMs: 60, status: 'warn' },
];

const SOURCES: AnalysisResultDto['sources'] = [
  { name: 'Ley 19.628 Art. 4', type: 'legal', url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599' },
  { name: 'Ley 21.521', type: 'legal', url: 'https://www.bcn.cl/leychile/navegar?idNorma=1187323' },
  { name: 'Ley 21.719 Art. 35', type: 'legal', url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272' },
  { name: 'CMF RPSF / alertas snapshot local', type: 'mock' },
];

const BANK_LETTER = `Asunto: Solicitud de revision y eliminacion de clausulas de tratamiento de datos

Estimados:

Solicito revisar el contrato ofrecido y eliminar o corregir las clausulas que autorizan el uso, cesion o intercambio de mis datos financieros con terceros no individualizados. El texto revisado permite compartir informacion transaccional y comercial por un plazo amplio, sin explicar con claridad que empresas recibiran los datos, para que fines concretos se usaran ni como puedo oponerme despues.

Como titular de los datos, pido que se me entregue una version clara y simple del contrato, indicando finalidad, plazo, destinatarios y mecanismo para revocar u oponerme al tratamiento. Esta solicitud se funda en las reglas de consentimiento y finalidad de la Ley 19.628 y en el marco de servicios financieros regulados por la Ley 21.521.

Mientras no se aclare o elimine esta autorizacion, solicito dejar pendiente la firma del contrato y no activar ningun tratamiento de datos transaccionales asociado a mi negocio.

Esta carta es un borrador revisable. No reemplaza asesoria legal.`;

const SERNAC_LETTER = `Asunto: Reclamo por informacion insuficiente y posible clausula abusiva

Solicito ingresar reclamo contra la entidad indicada por presentar un contrato de adhesion con informacion poco clara sobre uso de datos, terceros receptores y consecuencias para el consumidor. El contrato no explica en lenguaje simple que datos se compartiran, por cuanto tiempo ni con que empresas, lo que dificulta una decision informada antes de contratar.

Pido que se revise la practica comercial, que la entidad entregue una version transparente del contrato y que se ordene corregir las clausulas que puedan afectar el derecho a informacion veraz y oportuna. Tambien solicito que se preserve mi derecho a no aceptar cesiones amplias de datos como condicion para acceder al producto.

Esta carta es un borrador revisable. No reemplaza asesoria legal.`;

const GALPON_LETTER = `Asunto: Observaciones a contrato de arriendo comercial

Estimados:

Solicito revisar el borrador de arriendo del galpon antes de avanzar con la firma. En particular, pido aclarar la multa diaria, establecer un tope proporcional y definir un aviso minimo razonable para cualquier termino anticipado del contrato.

Tambien solicito eliminar o limitar toda renuncia anticipada a reclamar, porque necesito conservar canales de revision si aparecen cobros, incumplimientos o problemas de uso del inmueble. Como microemprendedor, requiero condiciones claras para planificar inventario, proveedores, patente comercial y continuidad de atencion.

Propongo incorporar una etapa de aviso y subsanacion antes de aplicar multas o termino anticipado, junto con recibo formal de garantia y detalle de causales especificas de incumplimiento.

Esta carta es un borrador revisable. No reemplaza asesoria legal.`;

const ATD_LETTER = `Asunto: Solicitud de acuerdo de tratamiento de datos para software contable

Estimados:

Antes de cargar informacion real de mi negocio en la plataforma, solicito el acuerdo o anexo de tratamiento de datos aplicable al servicio. El documento debe indicar responsable, encargado, finalidad del tratamiento, tipos de datos tratados, medidas de seguridad, plazo de conservacion, procedimiento de eliminacion o devolucion, y lista de subprocesadores.

Tambien solicito informar si los datos de ventas, clientes, boletas o pagos seran almacenados en servicios de nube, analizados por terceros o transferidos fuera de Chile. Hasta recibir esa informacion por escrito, no autorizo la carga de bases de clientes ni documentos comerciales reales.

Esta solicitud busca prevenir riesgos de cumplimiento y proteger datos de clientes y operaciones del negocio.

Esta carta es un borrador revisable. No reemplaza asesoria legal.`;

export const ANALYSIS_FIXTURES: Record<Scenario, FixtureWithoutRuntime> = {
  credito_trampa: {
    scenario: 'credito_trampa',
    riskScore: 76,
    riskLabel: 'Medio-alto',
    resultTitle: 'Credito con permiso amplio para compartir tus datos',
    resultText: 'El contrato parece pedir autorizacion para usar y compartir datos de ventas con terceros. Antes de firmar, conviene exigir una version mas clara y limitar esa autorizacion.',
    pillars: {
      good: [
        {
          title: 'Hay una oferta formal por escrito',
          detail: 'Tener el contrato permite revisar condiciones antes de firmar y pedir cambios por escrito.',
          citation: { articulo: 'Ley 19.496', ley: 'Derecho a informacion', url: 'https://www.bcn.cl/leychile/navegar?idNorma=61438' },
        },
      ],
      bad: [
        {
          title: 'Cesion amplia de datos',
          detail: 'El texto permite compartir historial transaccional con aliados comerciales no identificados.',
          severity: 'Alto',
          citation: { articulo: 'Art. 4', ley: 'Ley 19.628', url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599' },
        },
      ],
      red: [
        {
          title: 'Finalidad poco clara',
          detail: 'No queda claro para que se usaran los datos ni como oponerse despues.',
          severity: 'Alto',
          citation: { articulo: 'Art. 9', ley: 'Ley 19.628', url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599' },
        },
      ],
    },
    plan: [
      'No firmes todavia.',
      'Pide eliminar la autorizacion amplia para compartir datos con terceros.',
      'Solicita una lista concreta de empresas que recibiran tus datos.',
      'Si no responden claro, prepara reclamo SERNAC antes de contratar.',
    ],
    letters: { bank: BANK_LETTER, sernac: SERNAC_LETTER },
    sources: SOURCES,
    agentRuns: COMMON_AGENT_RUNS,
  },
  app_estafa: {
    scenario: 'app_estafa',
    riskScore: 88,
    riskLabel: 'Alto',
    resultTitle: 'App de credito con senales de imitador financiero',
    resultText: 'La entidad no aparece como registrada en el fixture CMF local y coincide con patrones de apps denunciadas. No entregues claves, RUT ni pagos anticipados.',
    pillars: {
      good: [{ title: 'Se puede verificar antes de pagar', detail: 'El nombre de la app permite buscar registro y alertas antes de entregar datos.' }],
      bad: [{ title: 'Promesa de credito inmediato', detail: 'Las ofertas con aprobacion instantanea y pago previo son una senal frecuente de fraude.', severity: 'Alto', citation: { articulo: 'Ley 21.521', ley: 'Marco fintech', url: 'https://www.bcn.cl/leychile/navegar?idNorma=1187323' } }],
      red: [{ title: 'Posible imitador', detail: 'La entidad coincide con dataset complementario de imitadoras para demo.', severity: 'Alto', citation: { articulo: 'CMF Alertas', ley: 'Fuente publica CMF', url: 'https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-43545.html' } }],
    },
    plan: ['No pagues anticipos.', 'No compartas claves ni codigos SMS.', 'Guarda pantallazos y URL.', 'Reporta la app y consulta a CMF/SERNAC.'],
    letters: { sernac: SERNAC_LETTER },
    sources: SOURCES,
    agentRuns: COMMON_AGENT_RUNS,
  },
  galpon: {
    scenario: 'galpon',
    riskScore: 63,
    riskLabel: 'Medio',
    resultTitle: 'Arriendo comercial con condiciones poco equilibradas',
    resultText: 'El contrato puede dejarte con multas o termino anticipado sin suficiente aviso. Conviene pedir aclaraciones antes de entregar garantia.',
    pillars: {
      good: [{ title: 'Contrato revisable antes de firma', detail: 'Aun puedes negociar plazo, garantia y causales de termino.' }],
      bad: [{ title: 'Multas poco explicadas', detail: 'Las penalidades aparecen sin formula clara ni tope visible.', severity: 'Medio', citation: { articulo: 'Clausulas abusivas', ley: 'Ley 19.496', url: 'https://www.bcn.cl/leychile/navegar?idNorma=61438' } }],
      red: [{ title: 'Termino anticipado amplio', detail: 'El arrendador podria terminar con poco aviso, afectando continuidad del negocio.', severity: 'Alto', citation: { articulo: 'Derecho a informacion', ley: 'Ley 19.496', url: 'https://www.bcn.cl/leychile/navegar?idNorma=61438' } }],
    },
    plan: ['Pide aclarar multas por escrito.', 'Negocia aviso minimo de termino.', 'No entregues garantia sin recibo.', 'Consulta si la patente permite operar en ese lugar.'],
    letters: { bank: GALPON_LETTER },
    sources: SOURCES,
    agentRuns: COMMON_AGENT_RUNS,
  },
  atd_software: {
    scenario: 'atd_software',
    riskScore: 81,
    riskLabel: 'Alto',
    resultTitle: 'Proveedor de software sin acuerdo claro de tratamiento de datos',
    resultText: 'El proveedor podria tratar datos de clientes y ventas sin explicar responsable, finalidad, seguridad ni subprocesadores.',
    pillars: {
      good: [{ title: 'Riesgo detectable en contrato', detail: 'Al estar por escrito, se puede exigir un anexo ATD antes de activar el servicio.' }],
      bad: [{ title: 'Falta finalidad clara', detail: 'No se explica para que se usaran datos de clientes, boletas o ventas.', severity: 'Alto', citation: { articulo: 'Art. 9', ley: 'Ley 19.628', url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599' } }],
      red: [{ title: 'Sin subprocesadores ni seguridad', detail: 'No se informa si terceros procesan datos ni que medidas de seguridad aplican.', severity: 'Alto', citation: { articulo: 'Art. 35', ley: 'Ley 21.719', url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272' } }],
    },
    plan: ['Pide anexo de tratamiento de datos.', 'Exige lista de subprocesadores.', 'Solicita medidas de seguridad por escrito.', 'No subas base de clientes hasta recibir respuesta.'],
    letters: { bank: ATD_LETTER },
    sources: SOURCES,
    agentRuns: COMMON_AGENT_RUNS,
  },
};

export function buildFixtureAnalysis(input: CreateAnalysisDto, id: string, piiRedacted: boolean): AnalysisResultDto {
  const fixture = ANALYSIS_FIXTURES[input.scenario];
  return {
    ...fixture,
    id,
    scenario: input.scenario,
    meta: {
      processedAt: new Date().toISOString(),
      zeroStorage: true,
      piiRedacted,
      mocked: true,
      tokenUsage: { inputTokens: 0, outputTokens: 0, fixture: true },
    },
  };
}
