export interface LegalFixtureChunk {
  ley: string;
  articulo: string;
  tema: string;
  url: string;
  text: string;
}

export const LEGAL_FIXTURE_CHUNKS: LegalFixtureChunk[] = [
  {
    ley: 'Ley 19.628',
    articulo: 'Art. 4',
    tema: 'Consentimiento para tratamiento de datos personales',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    text: 'El tratamiento de datos personales solo puede efectuarse cuando la ley lo autorice o el titular consienta expresamente en ello.',
  },
  {
    ley: 'Ley 19.628',
    articulo: 'Art. 9',
    tema: 'Finalidad y calidad de datos',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    text: 'Los datos personales deben utilizarse solo para los fines para los cuales fueron recolectados, salvo que provengan de fuentes accesibles al publico.',
  },
  {
    ley: 'Ley 21.521',
    articulo: 'Marco fintech',
    tema: 'Servicios financieros basados en informacion',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1187323',
    text: 'La ley fintech regula prestadores de servicios financieros y establece obligaciones para operar dentro del perimetro fiscalizado por la CMF.',
  },
  {
    ley: 'Ley 21.719',
    articulo: 'Art. 35',
    tema: 'Sanciones por infracciones graves',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
    text: 'La nueva ley de proteccion de datos personales contempla sanciones relevantes para infracciones en el tratamiento de datos.',
  },
  {
    ley: 'Ley 19.496',
    articulo: 'Clausulas abusivas',
    tema: 'Derechos del consumidor',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=61438',
    text: 'La legislacion de consumidor protege contra clausulas abusivas y exige informacion veraz y oportuna en contratos de adhesion.',
  },
  {
    ley: 'Ley 18.010',
    articulo: 'Tasa Maxima Convencional',
    tema: 'Usura e intereses',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=29438',
    text: 'Las operaciones de credito de dinero estan sujetas a limites de interes definidos por la Tasa Maxima Convencional.',
  },
];
