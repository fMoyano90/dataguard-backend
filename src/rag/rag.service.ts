import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { IngestDto } from './dto/ingest.dto';
import { QueryDto } from './dto/query.dto';
import { LEGAL_ARTICLE_CHUNKS } from '../data-sources/fixtures/legal-articles.fixtures';

const EMBEDDING_MODEL = 'multilingual-e5-large';
const EMBEDDING_DIMENSION = 1024;
const LEGAL_NAMESPACE = 'legal-chile';

export interface RagChunk {
  id: string;
  score?: number;
  text: string;
  source: string;
  metadata: Record<string, unknown>;
}

export interface QueryRawInput {
  text?: string;
  query?: string;
  topK?: number;
  namespace?: string;
}

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private pinecone: Pinecone;
  private anthropic: Anthropic;
  private indexName: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('anthropic.apiKey'),
    });

    this.pinecone = new Pinecone({
      apiKey: this.configService.get<string>('pinecone.apiKey'),
    });

    this.indexName = this.configService.get<string>('pinecone.indexName');

    await this.ensureIndex();
    await this.preloadLegalIfEmpty();
  }

  private async ensureIndex() {
    const existing = await this.pinecone.listIndexes();
    const names = existing.indexes?.map((i) => i.name) ?? [];

    if (!names.includes(this.indexName)) {
      this.logger.log(`Creando índice Pinecone: ${this.indexName}`);
      await this.pinecone.createIndex({
        name: this.indexName,
        dimension: EMBEDDING_DIMENSION,
        metric: 'cosine',
        spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
      });
      // espera a que el índice esté listo
      await new Promise((r) => setTimeout(r, 10_000));
      this.logger.log('Índice listo');
    } else {
      this.logger.log(`Índice ${this.indexName} ya existe`);
    }
  }

  private async embed(text: string, inputType: 'passage' | 'query'): Promise<number[]> {
    const response = await this.pinecone.inference.embed(
      EMBEDDING_MODEL,
      [text],
      { inputType, truncate: 'END' },
    );
    const embedding = response.data[0] as any;
    return embedding.values as number[];
  }

  async ingest(dto: IngestDto) {
    const vector = await this.embed(dto.text, 'passage');
    const id = uuidv4();

    const index = this.getIndex(dto.namespace);
    await index.upsert([
      {
        id,
        values: vector,
        metadata: {
          text: dto.text,
          source: dto.source ?? 'manual',
          createdAt: new Date().toISOString(),
          ...dto.metadata,
        },
      },
    ]);

    this.logger.log(`Documento ingresado: ${id}${dto.namespace ? ` namespace=${dto.namespace}` : ''}`);
    return { id, status: 'ingested', namespace: dto.namespace };
  }

  async query(dto: QueryDto) {
    const raw = await this.queryRaw({
      query: dto.query,
      topK: dto.topK,
      namespace: dto.namespace,
    });

    const context = raw.chunks
      .map((chunk) => chunk.text)
      .filter(Boolean)
      .join('\n\n---\n\n');

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: `Eres un asistente experto en regulación financiera y derechos del consumidor en Chile.
Responde SIEMPRE en español. Basa tu respuesta únicamente en el contexto proporcionado.
Si la información no está en el contexto, dilo claramente. Cita las fuentes cuando sea posible.
Leyes relevantes: Ley 19.628, Ley 21.521, Ley 21.719, Ley 21.398.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `<context>\n${context}\n</context>\n\n<question>${dto.query}</question>`,
        },
      ],
    });

    const answer =
      message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      answer,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: (message.usage as any).cache_read_input_tokens ?? 0,
      },
      sources: raw.chunks.map((chunk) => ({
        id: chunk.id,
        score: chunk.score,
        source: chunk.source,
        excerpt: `${chunk.text.slice(0, 200)}…`,
      })),
    };
  }

  async queryRaw(input: QueryRawInput): Promise<{ chunks: RagChunk[] }> {
    const query = input.query ?? input.text;
    if (!query) {
      throw new Error('queryRaw requires text or query');
    }

    const topK = input.topK ?? 5;
    const queryVector = await this.embed(query, 'query');
    const index = this.getIndex(input.namespace);
    const results = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });

    return {
      chunks: results.matches.map((match) => {
        const metadata = (match.metadata ?? {}) as Record<string, unknown>;
        return {
          id: match.id,
          score: match.score,
          text: String(metadata.text ?? ''),
          source: String(metadata.source ?? 'desconocido'),
          metadata,
        };
      }),
    };
  }

  private getIndex(namespace?: string) {
    const index = this.pinecone.index(this.indexName);
    return namespace ? index.namespace(namespace) : index;
  }

  private async preloadLegalIfEmpty() {
    try {
      const stats = await this.pinecone.index(this.indexName).describeIndexStats();
      const legalNamespaceCount = stats.namespaces?.[LEGAL_NAMESPACE]?.recordCount ?? 0;

      if (legalNamespaceCount > 0) {
        this.logger.log(`Legal namespace "${LEGAL_NAMESPACE}" already has ${legalNamespaceCount} vectors, skipping preload`);
        return;
      }

      this.logger.log(`Preloading ${LEGAL_ARTICLE_CHUNKS.length} legal chunks into namespace "${LEGAL_NAMESPACE}"...`);
      const batchSize = 20;

      for (let i = 0; i < LEGAL_ARTICLE_CHUNKS.length; i += batchSize) {
        const batch = LEGAL_ARTICLE_CHUNKS.slice(i, i + batchSize);
        const vectors = await Promise.all(
          batch.map(async (chunk) => {
            const id = `legal-${chunk.ley.replace(/[^a-z0-9]/gi, '').toLowerCase()}-${chunk.articulo.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
            const embedding = await this.embed(chunk.text, 'passage');
            return {
              id,
              values: embedding,
              metadata: {
                text: chunk.text,
                ley: chunk.ley,
                articulo: chunk.articulo,
                tema: chunk.tema,
                url: chunk.url,
                source: 'bcn-leychile',
                createdAt: new Date().toISOString(),
              },
            };
          }),
        );

        await this.getIndex(LEGAL_NAMESPACE).upsert(vectors);
        this.logger.log(`  Ingested ${Math.min(i + batchSize, LEGAL_ARTICLE_CHUNKS.length)}/${LEGAL_ARTICLE_CHUNKS.length}`);
      }

      this.logger.log(`Legal preload complete. ${LEGAL_ARTICLE_CHUNKS.length} chunks in "${LEGAL_NAMESPACE}".`);
    } catch (error) {
      this.logger.warn(`Legal preload failed, will use fixture fallback: ${(error as Error).message}`);
    }
  }
}
