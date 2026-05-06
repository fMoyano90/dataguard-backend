import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../../claude/claude.service';
import {
  AgentResult,
  RecommendationAgentInput,
  RecommendationAgentOutput,
  RecommendationLetters,
} from '../agent.types';
import { RECOMMENDATION_SYSTEM_PROMPT } from '../prompts/recommendation.prompt';

const MODEL = 'claude-sonnet-4-6';
const DISCLAIMER = 'Esta carta es un borrador revisable. No reemplaza asesoria legal.';

@Injectable()
export class RecommendationAgent {
  private readonly logger = new Logger(RecommendationAgent.name);

  constructor(private readonly claudeService: ClaudeService) {}

  async run(input: RecommendationAgentInput): Promise<AgentResult<RecommendationAgentOutput>> {
    const startedAt = Date.now();

    try {
      const response = await this.claudeService.completeJson<RecommendationAgentOutput>({
        model: MODEL,
        system: RECOMMENDATION_SYSTEM_PROMPT,
        maxTokens: 4000,
        messages: [
          {
            role: 'user',
            content: this.buildUserPrompt(input),
          },
        ],
      });

      const data = this.normalizeOutput(response.data, input);
      return {
        data,
        run: {
          agent: 'recommendation',
          model: MODEL,
          status: 'done',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            caseType: input.caseType,
            hasEntity: Boolean(input.entity),
            goodCount: input.pillars.good.length,
            badCount: input.pillars.bad.length,
            redCount: input.pillars.red.length,
            textLength: input.textRedacted.length,
          },
          outputSummary: {
            planCount: data.plan.length,
            hasBankLetter: Boolean(data.letters.bank),
            hasSernacLetter: Boolean(data.letters.sernac),
          },
          tokenUsage: response.raw.usage,
        },
      };
    } catch (error) {
      this.logger.warn(`RecommendationAgent fallback used: ${(error as Error).message}`);
      const data = this.fallback(input);
      return {
        data,
        run: {
          agent: 'recommendation',
          model: MODEL,
          status: 'warn',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            caseType: input.caseType,
            hasEntity: Boolean(input.entity),
            goodCount: input.pillars.good.length,
            badCount: input.pillars.bad.length,
            redCount: input.pillars.red.length,
            textLength: input.textRedacted.length,
          },
          outputSummary: {
            planCount: data.plan.length,
            hasBankLetter: Boolean(data.letters.bank),
            hasSernacLetter: Boolean(data.letters.sernac),
            fallback: true,
          },
        },
      };
    }
  }

  private buildUserPrompt(input: RecommendationAgentInput): string {
    return `<caso>\n${input.textRedacted}\n</caso>\n\n<entidad>${input.entity ?? 'No informada'}</entidad>\n<tipo_caso>${input.caseType}</tipo_caso>\n\n<pillars>\n${JSON.stringify(input.pillars)}\n</pillars>`;
  }

  private normalizeOutput(output: RecommendationAgentOutput, input: RecommendationAgentInput): RecommendationAgentOutput {
    const fallback = this.fallback(input);
    const letters = output?.letters ?? fallback.letters;

    return {
      plan: Array.isArray(output?.plan) && output.plan.length > 0
        ? output.plan.filter(Boolean).map(String).slice(0, 5)
        : fallback.plan,
      letters: {
        bank: this.normalizeLetter(letters.bank, fallback.letters.bank),
        sernac: this.normalizeLetter(letters.sernac, fallback.letters.sernac),
      },
    };
  }

  private normalizeLetter(letter: string | null | undefined, fallback: string | null): string | null {
    if (letter === null) return null;
    const value = String(letter || fallback || '').trim();
    if (!value) return null;
    return value.includes(DISCLAIMER) ? value : `${value}\n\n${DISCLAIMER}`;
  }

  private fallback(input: RecommendationAgentInput): RecommendationAgentOutput {
    const plan = [
      'No firmes ni entregues mas datos hasta aclarar los puntos marcados.',
      'Pide a la entidad una explicacion simple y por escrito de las clausulas observadas.',
      'Solicita eliminar o corregir las clausulas que permitan usar tus datos de forma amplia.',
      'Guarda capturas, contrato, correos y comprobantes por si necesitas reclamar.',
    ];

    if (input.caseType === 'app_estafa') {
      return {
        plan: [
          'No pagues anticipos ni entregues claves, RUT, fotos de carnet o datos bancarios.',
          'Guarda capturas de la app, mensajes, sitio web y comprobantes.',
          'Presenta reclamo ante SERNAC y revisa alertas de CMF antes de seguir.',
        ],
        letters: {
          bank: null,
          sernac: this.sernacLetter(input),
        },
      };
    }

    return {
      plan,
      letters: {
        bank: this.bankLetter(input),
        sernac: this.shouldGenerateSernac(input) ? this.sernacLetter(input) : null,
      },
    };
  }

  private shouldGenerateSernac(input: RecommendationAgentInput): boolean {
    return input.caseType === 'credito_trampa' || input.caseType === 'app_estafa' || input.pillars.red.length > 0;
  }

  private bankLetter(input: RecommendationAgentInput): string {
    const entity = input.entity ?? '[Nombre de la entidad]';
    const addressee = input.caseType === 'galpon'
      ? 'dueno o arrendador'
      : input.caseType === 'atd_software'
        ? 'proveedor del servicio'
        : 'entidad';
    const citations = this.citationText(input);

    return `Asunto: Solicitud de aclaracion y correccion de condiciones contractuales\n\nSres. ${entity}:\n\nYo, [Nombre del solicitante], [RUT del solicitante], solicito revisar las condiciones informadas antes de aceptar o continuar con el servicio. En particular, pido una explicacion clara y por escrito sobre los puntos que pueden afectar mis datos personales, mis obligaciones de pago o el uso de mi informacion financiera.\n\nComo ${addressee}, les solicito indicar que datos seran tratados, con que finalidad, por cuanto tiempo y si seran compartidos con terceros. Tambien pido que se eliminen o ajusten las clausulas que permitan un uso amplio o poco claro de mis datos.\n\nEsta solicitud se basa en los riesgos detectados en la revision del documento${citations ? ` y en las siguientes referencias: ${citations}` : ''}.\n\nAgradecere responder por escrito antes de que se me exija firmar, aceptar terminos o entregar informacion adicional.\n\n${DISCLAIMER}`;
  }

  private sernacLetter(input: RecommendationAgentInput): string {
    const entity = input.entity ?? '[Nombre de la entidad]';
    const citations = this.citationText(input);

    return `Asunto: Reclamo por condiciones poco claras o posible mala practica comercial\n\nA SERNAC:\n\nYo, [Nombre del solicitante], [RUT del solicitante], presento este reclamo contra ${entity} por condiciones que considero poco claras y potencialmente riesgosas para mis datos personales o derechos como consumidor.\n\nEn la revision del caso se detectaron puntos que pueden implicar uso amplio de informacion personal, falta de explicacion simple o riesgos relevantes antes de contratar. Solicito orientacion y gestion para que la entidad entregue informacion clara, corrija las clausulas observadas y respete mis derechos como consumidor.\n\nAdjuntare contrato, capturas, mensajes y otros antecedentes disponibles. ${citations ? `Referencias consideradas: ${citations}.` : ''}\n\nSolicito que se revise esta situacion y se oficie a la entidad si corresponde.\n\n${DISCLAIMER}`;
  }

  private citationText(input: RecommendationAgentInput): string {
    const citations = [
      ...input.pillars.good.map((item) => item.citation),
      ...input.pillars.bad.map((item) => item.citation),
      ...input.pillars.red.map((item) => item.citation),
    ].filter(Boolean);

    const unique = new Map(citations.map((citation) => [`${citation.ley}-${citation.articulo}`, citation]));
    return [...unique.values()].map((citation) => `${citation.ley} ${citation.articulo}`).join(', ');
  }
}
