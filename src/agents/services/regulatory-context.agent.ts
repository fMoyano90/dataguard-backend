import { Injectable, Logger } from '@nestjs/common';
import { LEGAL_FIXTURE_CHUNKS } from '../../data-sources/fixtures/legal.fixtures';
import { RagService } from '../../rag/rag.service';
import { AgentResult, LegalChunk, RegulatoryContextAgentInput, RegulatoryContextAgentOutput } from '../agent.types';

const MODEL = 'pinecone-rag';
const NAMESPACE = 'legal-chile';

@Injectable()
export class RegulatoryContextAgent {
  private readonly logger = new Logger(RegulatoryContextAgent.name);

  constructor(private readonly ragService: RagService) {}

  async run(input: RegulatoryContextAgentInput): Promise<AgentResult<RegulatoryContextAgentOutput>> {
    const startedAt = Date.now();
    const query = [input.caseType, input.entity, input.textRedacted].filter(Boolean).join('\n');

    try {
      const result = await this.ragService.queryRaw({
        query,
        topK: input.topK ?? 5,
        namespace: NAMESPACE,
      });
      const chunks = result.chunks.map((chunk) => this.fromRagChunk(chunk));

      if (chunks.length === 0) {
        throw new Error('Pinecone returned no legal chunks');
      }

      return {
        data: { chunks, source: 'pinecone' },
        run: {
          agent: 'regulatory',
          model: MODEL,
          status: 'done',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            caseType: input.caseType,
            topK: input.topK ?? 5,
            namespace: NAMESPACE,
            hasEntity: Boolean(input.entity),
          },
          outputSummary: {
            chunks: chunks.length,
            source: 'pinecone',
          },
        },
      };
    } catch (error) {
      this.logger.warn(`RegulatoryContextAgent fallback used: ${(error as Error).message}`);
      const chunks = this.fixtureChunks(input.topK ?? 5);
      return {
        data: { chunks, source: 'fixture' },
        run: {
          agent: 'regulatory',
          model: MODEL,
          status: 'warn',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            caseType: input.caseType,
            topK: input.topK ?? 5,
            namespace: NAMESPACE,
            hasEntity: Boolean(input.entity),
          },
          outputSummary: {
            chunks: chunks.length,
            source: 'fixture',
            fallback: true,
          },
        },
      };
    }
  }

  private fromRagChunk(chunk: { id: string; score?: number; text: string; source: string; metadata: Record<string, unknown> }): LegalChunk {
    return {
      id: chunk.id,
      ley: String(chunk.metadata.ley ?? 'Marco legal chileno'),
      articulo: String(chunk.metadata.articulo ?? 'Referencia'),
      tema: chunk.metadata.tema ? String(chunk.metadata.tema) : undefined,
      text: chunk.text,
      url: String(chunk.metadata.url ?? chunk.source),
      score: chunk.score,
      source: chunk.source,
      mocked: Boolean(chunk.metadata._mocked),
    };
  }

  private fixtureChunks(topK: number): LegalChunk[] {
    return LEGAL_FIXTURE_CHUNKS.slice(0, topK).map((chunk, index) => ({
      id: `legal-fixture-${index}`,
      ley: chunk.ley,
      articulo: chunk.articulo,
      tema: chunk.tema,
      text: chunk.text,
      url: chunk.url,
      score: 0,
      source: 'fixture',
      mocked: true,
    }));
  }
}
