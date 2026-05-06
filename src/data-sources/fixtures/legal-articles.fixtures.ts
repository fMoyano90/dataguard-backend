export interface LegalArticleChunk {
  ley: string;
  articulo: string;
  tema: string;
  url: string;
  text: string;
}

export const LEGAL_ARTICLE_CHUNKS: LegalArticleChunk[] = [
  // Ley 19.628 - Proteccion de Datos Personales (vigente)
  {
    ley: 'Ley 19.628',
    articulo: 'Art. 2',
    tema: 'Definiciones clave',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    text: 'Datos de caracter personal: informacion concerniente a personas naturales, identificadas o identificables. Tratamiento de datos: operaciones y procedimientos sistematicos de recoleccion, almacenamiento, uso, comunicacion o cancelacion de datos personales.',
  },
  {
    ley: 'Ley 19.628',
    articulo: 'Art. 4',
    tema: 'Consentimiento para tratamiento de datos',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    text: 'El tratamiento de datos personales solo puede efectuarse cuando la ley lo autorice o el titular consienta expresamente en ello. El consentimiento debe ser libre, especifico e informado. El titular puede revocarlo en cualquier momento.',
  },
  {
    ley: 'Ley 19.628',
    articulo: 'Art. 5',
    tema: 'Datos sensibles',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    text: 'Los datos referentes a creencias religiosas, origen racial, salud, vida sexual y antecedentes penales no pueden ser objeto de tratamiento salvo cuando la ley lo autorice, se trate de datos necesarios para la determinacion de prestaciones de salud, o el titular haya dado su consentimiento expreso.',
  },
  {
    ley: 'Ley 19.628',
    articulo: 'Art. 9',
    tema: 'Finalidad y calidad de datos',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    text: 'Los datos personales deben utilizarse solo para los fines para los cuales fueron recolectados, salvo que provengan de fuentes accesibles al publico. Los datos deben ser exactos, actualizados y pertinentes para la finalidad para la cual fueron recolectados.',
  },
  {
    ley: 'Ley 19.628',
    articulo: 'Art. 10',
    tema: 'Derecho de acceso e informacion',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    text: 'El titular de los datos tiene derecho a solicitar informacion sobre los datos que le conciernen, su origen, finalidad y la identidad del responsable del tratamiento. El responsable debe entregar esta informacion de manera gratuita.',
  },
  {
    ley: 'Ley 19.628',
    articulo: 'Art. 12',
    tema: 'Derecho de oposicion y supresion',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    text: 'El titular puede solicitar la modificacion o actualizacion de sus datos personales, asi como su eliminacion cuando estos no sean necesarios o hayan dejado de serlo para los fines que motivaron su almacenamiento. Tambien puede oponerse al tratamiento de sus datos.',
  },
  {
    ley: 'Ley 19.628',
    articulo: 'Art. 16',
    tema: 'Cesion de datos a terceros',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    text: 'Los datos personales no pueden ser comunicados a terceros sin el consentimiento del titular, salvo que la ley lo autorice. Cuando se ceden datos, el responsable debe informar al titular sobre la identidad del cesionario y la finalidad de la cesion.',
  },

  // Ley 21.719 - Nueva Ley de Proteccion de Datos (vigencia dic 2026)
  {
    ley: 'Ley 21.719',
    articulo: 'Art. 1',
    tema: 'Objeto de la ley',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
    text: 'Esta ley tiene por objeto proteger el tratamiento de los datos personales, garantizando el derecho a la proteccion de datos personales consagrado en la Constitucion Politica de la Republica. Establece la Agencia de Proteccion de Datos Personales como organismo fiscalizador autonomo.',
  },
  {
    ley: 'Ley 21.719',
    articulo: 'Art. 3',
    tema: 'Principios del tratamiento de datos',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
    text: 'El tratamiento de datos personales se regira por los principios de licitud, lealtad, transparencia, finalidad, minimizacion, exactitud, limitacion del plazo de conservacion, responsabilidad proactiva y seguridad. El responsable debe poder demostrar el cumplimiento de estos principios.',
  },
  {
    ley: 'Ley 21.719',
    articulo: 'Art. 5',
    tema: 'Base legal para el tratamiento',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
    text: 'El tratamiento de datos personales solo sera licito cuando cuente con una base legal: consentimiento del titular, cumplimiento de una obligacion legal, ejecucion de un contrato, interes legitimo del responsable, proteccion de la vida, o cumplimiento de una mision de interes publico.',
  },
  {
    ley: 'Ley 21.719',
    articulo: 'Art. 10',
    tema: 'Derechos ARCO+',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
    text: 'El titular de datos personales tiene los siguientes derechos: acceso, rectificacion, cancelacion, oposicion, portabilidad y bloqueo de sus datos. El responsable debe responder a estas solicitudes en un plazo maximo de 15 dias habiles y de forma gratuita.',
  },
  {
    ley: 'Ley 21.719',
    articulo: 'Art. 12',
    tema: 'Derecho a la portabilidad',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
    text: 'El titular tiene derecho a recibir los datos personales que le conciernen en un formato estructurado y de uso comun, y a transmitirlos a otro responsable sin impedimentos. Este derecho aplica especialmente a datos financieros, transaccionales y de consumo.',
  },
  {
    ley: 'Ley 21.719',
    articulo: 'Art. 15',
    tema: 'Notificacion de brechas de seguridad',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
    text: 'Cuando se produzca una violacion de seguridad que afecte datos personales, el responsable debe notificar a la Agencia de Proteccion de Datos en un plazo no superior a 3 dias habiles desde que tenga conocimiento de la brecha. Si la brecha genera un riesgo alto para los titulares, tambien debe notificar a los afectados.',
  },
  {
    ley: 'Ley 21.719',
    articulo: 'Art. 35',
    tema: 'Sanciones por infracciones graves',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
    text: 'Las infracciones graves a esta ley seran sancionadas con multas de hasta 20.000 UTM. Se consideran infracciones graves: tratar datos sin base legal, no notificar brechas de seguridad, no atender derechos ARCO+, transferir datos internacionalmente sin garantias, y no realizar evaluaciones de impacto cuando corresponda.',
  },
  {
    ley: 'Ley 21.719',
    articulo: 'Art. 36',
    tema: 'Sanciones por infracciones muy graves',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
    text: 'Las infracciones muy graves seran sancionadas con multas de hasta 30.000 UTM. Se consideran muy graves: tratar datos sensibles sin autorizacion, reincidentia en infracciones graves, obstruir la fiscalizacion de la Agencia, y tratar datos de menores de edad sin consentimiento del representante legal.',
  },

  // Ley 21.521 - Ley Fintech
  {
    ley: 'Ley 21.521',
    articulo: 'Art. 1',
    tema: 'Marco de prestadores de servicios financieros',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1187323',
    text: 'Esta ley establece el marco regulatorio para los prestadores de servicios financieros basados en tecnologia. Regula plataformas de financiamiento colectivo, sistemas alternativos de transaccion, intermediacion de instrumentos financieros, enrutamiento de ordenes, asesoria crediticia y de inversion, y custodia de instrumentos financieros.',
  },
  {
    ley: 'Ley 21.521',
    articulo: 'Art. 6',
    tema: 'Registro de prestadores en CMF',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1187323',
    text: 'Los prestadores de servicios financieros regulados por esta ley deben inscribirse en el registro que lleva la Comision para el Mercado Financiero (CMF). Solo las entidades registradas pueden ofrecer estos servicios al publico. La CMF fiscaliza su cumplimiento.',
  },
  {
    ley: 'Ley 21.521',
    articulo: 'Art. 23',
    tema: 'Sistema de Finanzas Abiertas (Open Finance)',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1187323',
    text: 'Se establece el Sistema de Finanzas Abiertas que permite a los usuarios compartir su informacion financiera entre instituciones de forma segura, estandarizada y con su consentimiento. Las instituciones deben compartir datos de productos financieros bajo estandares tecnicos definidos por la CMF.',
  },
  {
    ley: 'Ley 21.521',
    articulo: 'Art. 25',
    tema: 'Consentimiento del usuario en Open Finance',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1187323',
    text: 'El intercambio de informacion financiera requiere el consentimiento expreso, libre, especifico e informado del usuario. El usuario puede revocar su consentimiento en cualquier momento. Las instituciones no pueden condicionar la prestacion de servicios al consentimiento para compartir datos no necesarios.',
  },
  {
    ley: 'Ley 21.521',
    articulo: 'Art. 27',
    tema: 'Seguridad y proteccion de datos financieros',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1187323',
    text: 'Los prestadores de servicios financieros deben implementar medidas de seguridad adecuadas para proteger la informacion de los usuarios, incluyendo cifrado de datos, autenticacion robusta, y protocolos de respuesta ante incidentes de seguridad. La CMF puede establecer estandares tecnicos minimos.',
  },
  {
    ley: 'Ley 21.521',
    articulo: 'NCG 514',
    tema: 'Normativa Open Finance de la CMF',
    url: 'https://www.cmfchile.cl/normativa/ncg_514_2024.pdf',
    text: 'La Norma de Caracter General 514 de la CMF establece los estandares tecnicos, plazos y condiciones para la implementacion del Sistema de Finanzas Abiertas. Define las categorias de datos compartibles, los estandares de API, y las obligaciones de seguridad para participantes del ecosistema.',
  },

  // Ley 19.496 - Derechos del Consumidor
  {
    ley: 'Ley 19.496',
    articulo: 'Art. 1',
    tema: 'Derecho a informacion veraz',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=61438',
    text: 'Todo consumidor tiene derecho a recibir informacion veraz, oportuna y comprensible sobre los productos y servicios que adquiere o utiliza. Los proveedores deben informar de manera clara sobre precios, condiciones contractuales, riesgos y caracteristicas esenciales del producto o servicio.',
  },
  {
    ley: 'Ley 19.496',
    articulo: 'Art. 3',
    tema: 'Contratos de adhesion',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=61438',
    text: 'En los contratos de adhesion, las clausulas deben ser redactadas de manera clara, comprensible y con letra facilmente legible. Las clausulas ambiguas se interpretan en favor del consumidor. Las clausulas que limiten derechos del consumidor deben ser especialmente destacadas.',
  },
  {
    ley: 'Ley 19.496',
    articulo: 'Art. 16',
    tema: 'Clausulas abusivas',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=61438',
    text: 'Se consideran nulas las clausulas que: impongan al consumidor obligaciones desproporcionadas, limiten la responsabilidad del proveedor por incumplimiento, inviertan la carga de la prueba en perjuicio del consumidor, o faculten al proveedor para modificar unilateralmente el contrato sin justa causa.',
  },

  // Ley 21.398 - Pro Consumidor
  {
    ley: 'Ley 21.398',
    articulo: 'Art. 1',
    tema: 'Analisis de solvencia obligatorio',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1170464',
    text: 'Los proveedores de credito deben realizar un analisis de solvencia del consumidor antes de otorgar cualquier operacion de credito. Este analisis debe evaluar la capacidad de pago real del consumidor y no puede basarse unicamente en la existencia de garantias.',
  },
  {
    ley: 'Ley 21.398',
    articulo: 'Art. 5',
    tema: 'Termino anticipado de contratos financieros',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1170464',
    text: 'El consumidor tiene derecho a poner termino anticipado a cualquier contrato de credito en cualquier momento, sin penalizaciones ni cobros adicionales distintos a los intereses devengados hasta la fecha de termino. El proveedor debe informar este derecho de manera clara.',
  },
  {
    ley: 'Ley 21.398',
    articulo: 'Art. 10',
    tema: 'Prohibicion de ofertas crediticias engañosas',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1170464',
    text: 'Se prohibe realizar ofertas crediticias que induzcan a error al consumidor sobre las condiciones reales del credito, incluyendo tasas de interes, comisiones, plazos y costos totales. Las ofertas deben expresar el Costo Total del Credito (Tasa de Interes Maxima Convencional incluida).',
  },

  // Ley 18.010 - Operaciones de Credito de Dinero
  {
    ley: 'Ley 18.010',
    articulo: 'Art. 1',
    tema: 'Regulacion de operaciones de credito',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=29438',
    text: 'Las operaciones de credito de dinero son aquellas en que una parte entrega a otra una cantidad de dinero con la obligacion de restituir igual suma mas intereses. Se regulan las modalidades, tasas y condiciones de estas operaciones para proteger a los consumidores.',
  },
  {
    ley: 'Ley 18.010',
    articulo: 'Art. 6 bis',
    tema: 'Tasa Maxima Convencional (TMC)',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=29438',
    text: 'Las operaciones de credito de dinero no pueden cobrar intereses superiores a la Tasa Maxima Convencional fijada por el Banco Central. Superar la TMC constituye delito de usura. La TMC se actualiza periodicamente y se publica en el Diario Oficial.',
  },

  // Ley 21.459 - Delitos Informaticos
  {
    ley: 'Ley 21.459',
    articulo: 'Art. 1',
    tema: 'Acceso ilicito a sistemas',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1177743',
    text: 'Será sancionado con presidio quien acceda sin autorizacion a un sistema informatico o parte de el, o se mantenga en contra de la voluntad de quien tenga el legitimo derecho de excluirlo. Se protege la integridad y confidencialidad de los sistemas y datos.',
  },
  {
    ley: 'Ley 21.459',
    articulo: 'Art. 4',
    tema: 'Fraude informatico',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1177743',
    text: 'Comete fraude informatico quien, con animo de lucro, altera o manipula un sistema informatico o datos informaticos para obtener un beneficio patrimonial ilegitimo en perjuicio de otro. La pena incluye presidio y multa. Aplica a phishing, estafas digitales y suplantacion.',
  },

  // Ley 21.663 - Ley Marco de Ciberseguridad (ANCI)
  {
    ley: 'Ley 21.663',
    articulo: 'Art. 1',
    tema: 'Objeto y ambito de la ANCI',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1202434',
    text: 'Esta ley crea la Agencia Nacional de Ciberseguridad (ANCI) y establece el marco de ciberseguridad para servicios esenciales y operadores de importancia vital. Incluye instituciones financieras, sistemas de pago y plataformas fintech dentro del perimetro de servicios regulados.',
  },
  {
    ley: 'Ley 21.663',
    articulo: 'Art. 5',
    tema: 'Reporte de incidentes al CSIRT',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1202434',
    text: 'Los servicios esenciales deben reportar incidentes de ciberseguridad al CSIRT Nacional en plazos estrictos: alerta temprana dentro de 3 horas, descripcion detallada dentro de 72 horas, e informe completo dentro de 15 dias corridos desde el conocimiento del incidente.',
  },
];
