import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { DataSourceService } from '../data-sources/data-source.service';
import { PiiValidationService } from '../pii/pii-validation.service';
import { RagService } from '../rag/rag.service';
import { LEGAL_FIXTURE_CHUNKS } from '../data-sources/fixtures/legal.fixtures';

export interface ToolDef<I = unknown, O = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<I>;
  inputJsonSchema: Record<string, unknown>;
  run: (input: I) => Promise<O> | O;
}

@Injectable()
export class ToolRegistryService implements OnModuleInit {
  private readonly tools = new Map<string, ToolDef>();

  constructor(
    private readonly dataSourceService: DataSourceService,
    private readonly piiValidationService: PiiValidationService,
    private readonly ragService: RagService,
  ) {}

  onModuleInit() {
    this.registerDefaults();
  }

  register<I, O>(def: ToolDef<I, O>): void {
    this.tools.set(def.name, def as ToolDef);
  }

  list(): Array<Omit<ToolDef, 'run' | 'inputSchema'>> {
    return [...this.tools.values()].map(({ name, description, inputJsonSchema }) => ({
      name,
      description,
      inputJsonSchema,
    }));
  }

  get(name: string): ToolDef | undefined {
    return this.tools.get(name);
  }

  toAnthropicTools() {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputJsonSchema,
    }));
  }

  async runAsClaudeTool(name: string, input: unknown): Promise<unknown> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    const parsed = tool.inputSchema.parse(input);
    return tool.run(parsed);
  }

  private registerDefaults() {
    if (this.tools.size > 0) return;

    this.register({
      name: 'search_pinecone_legal',
      description: 'Busca chunks legales chilenos en Pinecone namespace legal-chile con fallback local.',
      inputSchema: z.object({ query: z.string().min(2), topK: z.number().min(1).max(10).optional() }),
      inputJsonSchema: objectSchema({
        query: { type: 'string', description: 'Consulta legal o extracto del caso' },
        topK: { type: 'number', description: 'Cantidad maxima de chunks', minimum: 1, maximum: 10 },
      }, ['query']),
      run: async ({ query, topK }) => {
        try {
          return await this.ragService.queryRaw({ query, topK: topK ?? 5, namespace: 'legal-chile' });
        } catch {
          return {
            chunks: LEGAL_FIXTURE_CHUNKS.slice(0, topK ?? 5).map((chunk, index) => ({
              id: `legal-fixture-${index}`,
              score: 0,
              text: chunk.text,
              source: chunk.url,
              metadata: { ...chunk, _mocked: true },
            })),
          };
        }
      },
    });

    this.register({
      name: 'check_cmf_imitator',
      description: 'Verifica si una entidad esta registrada en CMF o marcada como imitadora/denunciada.',
      inputSchema: z.object({ name: z.string().min(2) }),
      inputJsonSchema: objectSchema({ name: { type: 'string', description: 'Nombre de empresa, banco, fintech o app' } }, ['name']),
      run: ({ name }) => this.dataSourceService.lookupCmfEntity(name),
    });

    this.register({
      name: 'check_phishtank_url',
      description: 'Verifica una URL sospechosa contra PhishTank con fallback heuristico.',
      inputSchema: z.object({ url: z.string().url() }),
      inputJsonSchema: objectSchema({ url: { type: 'string', description: 'URL sospechosa con protocolo http/https' } }, ['url']),
      run: ({ url }) => this.dataSourceService.checkPhishTankUrl(url),
    });

    this.register({
      name: 'explain_law_simple',
      description: 'Entrega una explicacion simple de una ley chilena para una persona sin formacion legal.',
      inputSchema: z.object({ numero: z.string().min(2), articulo: z.string().optional() }),
      inputJsonSchema: objectSchema({
        numero: { type: 'string', description: 'Numero de ley, por ejemplo 21.521' },
        articulo: { type: 'string', description: 'Articulo opcional' },
      }, ['numero']),
      run: ({ numero, articulo }) => this.dataSourceService.explainLawSimple(numero, articulo),
    });

    this.register({
      name: 'check_usury_rate',
      description: 'Verifica si una tasa anual supera la Tasa Maxima Convencional fallback.',
      inputSchema: z.object({ rateAnnual: z.number().min(0).max(500) }),
      inputJsonSchema: objectSchema({ rateAnnual: { type: 'number', description: 'Tasa anual en porcentaje' } }, ['rateAnnual']),
      run: ({ rateAnnual }) => this.dataSourceService.checkUsuryRate(rateAnnual),
    });

    this.register({
      name: 'detect_open_finance_clause',
      description: 'Detecta clausulas Open Finance o cesion de datos financieros a terceros.',
      inputSchema: z.object({ text: z.string().min(1) }),
      inputJsonSchema: objectSchema({ text: { type: 'string', description: 'Texto contractual a revisar' } }, ['text']),
      run: ({ text }) => this.dataSourceService.detectOpenFinanceClause(text),
    });

    this.register({
      name: 'check_atd_in_contract',
      description: 'Verifica si un contrato contiene elementos basicos de Acuerdo de Tratamiento de Datos.',
      inputSchema: z.object({ text: z.string().min(1) }),
      inputJsonSchema: objectSchema({ text: { type: 'string', description: 'Texto contractual a revisar' } }, ['text']),
      run: ({ text }) => this.dataSourceService.checkAtdInContract(text),
    });

    this.register({
      name: 'validate_pii',
      description: 'Escanea PII residual en texto ya redactado.',
      inputSchema: z.object({ text: z.string() }),
      inputJsonSchema: objectSchema({ text: { type: 'string', description: 'Texto a escanear' } }, ['text']),
      run: ({ text }) => this.piiValidationService.scan(text),
    });

    this.register({
      name: 'save_analysis_result',
      description: 'Stub auditado para persistir resultado de analisis cuando AnalysesService este conectado.',
      inputSchema: z.object({ analysisId: z.string(), payload: z.record(z.string(), z.unknown()) }),
      inputJsonSchema: objectSchema({
        analysisId: { type: 'string', description: 'ID de analisis' },
        payload: { type: 'object', description: 'Resultado canonico a persistir' },
      }, ['analysisId', 'payload']),
      run: () => ({ ok: false, reason: 'AnalysesService not wired yet', _mocked: true }),
    });

    this.register({
      name: 'generate_report',
      description: 'Stub auditado para ensamblar reporte cuando ReportService este conectado.',
      inputSchema: z.object({ analysisId: z.string() }),
      inputJsonSchema: objectSchema({ analysisId: { type: 'string', description: 'ID de analisis' } }, ['analysisId']),
      run: ({ analysisId }) => ({ analysisId, ok: false, reason: 'ReportService not wired yet', _mocked: true }),
    });
  }
}

function objectSchema(properties: Record<string, unknown>, required: string[] = []) {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}
