import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
import { Connection } from 'mongoose';

export type DependencyStatus = 'ok' | 'down';

export interface AiHealthResponse {
  claude: DependencyStatus;
  pinecone: DependencyStatus;
  mongo: DependencyStatus;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async ai(): Promise<AiHealthResponse> {
    const [claude, pinecone] = await Promise.all([
      this.checkClaude(),
      this.checkPinecone(),
    ]);

    return {
      claude,
      pinecone,
      mongo: this.connection.readyState === 1 ? 'ok' : 'down',
    };
  }

  private async checkClaude(): Promise<DependencyStatus> {
    const apiKey = this.configService.get<string>('anthropic.apiKey');
    if (!apiKey) return 'down';

    try {
      const client = new Anthropic({ apiKey });
      await withTimeout(client.models.list({ limit: 1 }), 3_000);
      return 'ok';
    } catch (error) {
      this.logger.warn(`Claude health check failed: ${(error as Error).message}`);
      return 'down';
    }
  }

  private async checkPinecone(): Promise<DependencyStatus> {
    const apiKey = this.configService.get<string>('pinecone.apiKey');
    const indexName = this.configService.get<string>('pinecone.indexName');
    if (!apiKey || !indexName) return 'down';

    try {
      const pinecone = new Pinecone({ apiKey });
      const response = await withTimeout(pinecone.listIndexes(), 3_000);
      const names = response.indexes?.map((index) => index.name) ?? [];
      return names.includes(indexName) ? 'ok' : 'down';
    } catch (error) {
      this.logger.warn(`Pinecone health check failed: ${(error as Error).message}`);
      return 'down';
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
}
