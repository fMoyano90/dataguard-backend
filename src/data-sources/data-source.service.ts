import { Injectable, Logger } from '@nestjs/common';
import { EntityCheckResultDto, PhishTankResultDto } from '../entity-check/dto/entity-check-result.dto';
import { CMF_REGISTRY_FIXTURES } from './fixtures/cmf-registry.fixtures';
import { DENUNCIADAS_EXTRA_FIXTURES } from './fixtures/denunciadas-extra.fixtures';

export interface LawExplanationResult {
  titulo: string;
  resumen_simple: string;
  url: string;
  _mocked?: boolean;
}

export interface UsuryRateResult {
  exceedsTMC: boolean;
  currentTMC: number;
  source: string;
  _mocked?: boolean;
}

export interface OpenFinanceDetectionResult {
  found: boolean;
  matches: string[];
}

export interface AtdDetectionResult {
  hasATD: boolean;
  missingFields: string[];
}

@Injectable()
export class DataSourceService {
  private readonly logger = new Logger(DataSourceService.name);
  private readonly phishTankCache = new Map<string, { expiresAt: number; result: PhishTankResultDto }>();

  async lookupCmfEntity(name: string): Promise<EntityCheckResultDto> {
    const normalized = this.normalize(name);

    const registered = CMF_REGISTRY_FIXTURES.find((entity) =>
      this.matchesEntity(normalized, [entity.name, ...entity.aliases]),
    );
    if (registered) {
      return {
        name,
        registered: true,
        isImitator: false,
        source: `CMF RPSF (snapshot ${registered.snapshotDate})`,
        evidence: `Registrada: ${registered.licenseType}`,
        _mocked: false,
      };
    }

    const denounced = DENUNCIADAS_EXTRA_FIXTURES.find((entity) =>
      this.matchesEntity(normalized, [entity.name, ...entity.aliases]),
    );
    if (denounced) {
      this.logger.warn(`[MOCK] Entity match from denounced fixture: ${denounced.name}`);
      return {
        name,
        registered: false,
        isImitator: true,
        source: denounced.source,
        evidence: `Reportada en seguimiento de fraudes 2025: ${denounced.motivo}`,
        _mocked: denounced._mocked,
      };
    }

    return {
      name,
      registered: false,
      isImitator: false,
      source: 'CMF RPSF (snapshot local)',
      evidence: 'No encontrada en registro ni alertas locales. Verifica el nombre exacto antes de firmar.',
      _mocked: false,
    };
  }

  async checkPhishTankUrl(url: string): Promise<PhishTankResultDto> {
    const cached = this.phishTankCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);
      const body = new URLSearchParams({ url, format: 'json' });

      const response = await fetch('https://checkurl.phishtank.com/checkurl/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`PhishTank HTTP ${response.status}`);
      }

      const payload = (await response.json()) as any;
      const result: PhishTankResultDto = {
        in_database: Boolean(payload?.results?.in_database),
        verified: Boolean(payload?.results?.verified),
        valid_phish: Boolean(payload?.results?.valid),
        phish_detail_url: payload?.results?.phish_detail_page,
      };
      this.phishTankCache.set(url, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, result });
      return result;
    } catch (error) {
      this.logger.warn(`PhishTank unavailable, using heuristic fallback: ${(error as Error).message}`);
      return this.phishTankFallback(url);
    }
  }

  async explainLawSimple(numero: string, articulo?: string): Promise<LawExplanationResult> {
    const cleanNumber = numero.replace(/^ley\s*/i, '').trim();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);
      const response = await fetch(`https://www.bcn.cl/api-leyfacil/?ley=${encodeURIComponent(cleanNumber)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`BCN HTTP ${response.status}`);
      }

      const payload = (await response.json()) as any;
      return {
        titulo: payload?.titulo ?? `Ley ${cleanNumber}`,
        resumen_simple: payload?.resumen ?? `Resumen Ley ${cleanNumber}${articulo ? `, ${articulo}` : ''}`,
        url: `https://www.bcn.cl/leychile/consulta/listaresultadosimple?cadena=${encodeURIComponent(cleanNumber)}`,
      };
    } catch (error) {
      this.logger.warn(`BCN Ley Facil unavailable, using fallback: ${(error as Error).message}`);
      return {
        titulo: `Ley ${cleanNumber}`,
        resumen_simple: this.getFallbackLawSummary(cleanNumber, articulo),
        url: `https://www.bcn.cl/leychile/consulta/listaresultadosimple?cadena=${encodeURIComponent(cleanNumber)}`,
        _mocked: true,
      };
    }
  }

  checkUsuryRate(rateAnnual: number): UsuryRateResult {
    const currentTMC = 27;
    this.logger.warn('[MOCK] Using hardcoded TMC fallback: 27% annual');
    return {
      exceedsTMC: rateAnnual > currentTMC,
      currentTMC,
      source: 'fallback TMC demo; reemplazar por Banco Central BDE',
      _mocked: true,
    };
  }

  detectOpenFinanceClause(text: string): OpenFinanceDetectionResult {
    const keywords = [
      'open finance',
      'historial transaccional',
      'aliados comerciales',
      'terceros',
      'compartir datos',
      'datos transaccionales',
    ];
    const normalized = this.normalize(text);
    const matches = keywords.filter((keyword) => normalized.includes(this.normalize(keyword)));
    return { found: matches.length > 0, matches };
  }

  checkAtdInContract(text: string): AtdDetectionResult {
    const required = [
      { label: 'responsable del tratamiento', terms: ['responsable del tratamiento', 'responsable de datos'] },
      { label: 'finalidad', terms: ['finalidad', 'proposito del tratamiento', 'propósito del tratamiento'] },
      { label: 'subprocesadores', terms: ['subprocesadores', 'subencargados', 'terceros encargados'] },
      { label: 'medidas de seguridad', terms: ['medidas de seguridad', 'seguridad de la informacion'] },
    ];

    const normalized = this.normalize(text);
    const missingFields = required
      .filter((field) => !field.terms.some((term) => normalized.includes(this.normalize(term))))
      .map((field) => field.label);

    return { hasATD: missingFields.length === 0, missingFields };
  }

  listSources() {
    return [
      { name: 'CMF RPSF', type: 'public', url: 'https://www.cmfchile.cl/institucional/estadisticas/seg_rgpsf.php' },
      { name: 'CMF Alertas al Publico', type: 'public', url: 'https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-43545.html' },
      { name: 'BCN Ley Chile', type: 'legal', url: 'https://www.bcn.cl/leychile/' },
      { name: 'BCN Ley Facil', type: 'legal', url: 'https://www.bcn.cl/leyfacil/' },
      { name: 'PhishTank', type: 'public', url: 'https://phishtank.org/' },
      { name: 'Banco Central BDE', type: 'public', url: 'https://si3.bcentral.cl/Siete/' },
      { name: 'Pinecone legal-chile', type: 'legal' },
      { name: 'Fixtures demo denunciadas-extra', type: 'mock' },
    ];
  }

  private matchesEntity(normalizedInput: string, candidates: string[]): boolean {
    return candidates.some((candidate) => {
      const normalizedCandidate = this.normalize(candidate);
      return normalizedInput.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedInput);
    });
  }

  private normalize(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private phishTankFallback(url: string): PhishTankResultDto {
    const normalized = this.normalize(url);
    const suspicious = normalized.includes('lucasfacil') || normalized.includes('login') || normalized.includes('credito');
    return {
      in_database: suspicious,
      verified: false,
      valid_phish: suspicious,
      phish_detail_url: undefined,
    };
  }

  private getFallbackLawSummary(numero: string, articulo?: string): string {
    const summaries: Record<string, string> = {
      '19.628': 'Regula el tratamiento de datos personales en Chile y exige base legal o consentimiento del titular.',
      '21.521': 'Regula servicios fintech y el perimetro de prestadores fiscalizados por la CMF.',
      '21.719': 'Moderniza la proteccion de datos personales y establece obligaciones reforzadas para responsables de tratamiento.',
      '19.496': 'Protege derechos de consumidores, incluyendo informacion clara y control de clausulas abusivas.',
      '21.398': 'Fortalece derechos de consumidores y herramientas de reclamo frente a malas practicas comerciales.',
      '18.010': 'Regula operaciones de credito de dinero y limites de intereses mediante Tasa Maxima Convencional.',
    };
    return `${summaries[numero] ?? 'Resumen legal no disponible en fallback local.'}${articulo ? ` Referencia solicitada: ${articulo}.` : ''}`;
  }
}
