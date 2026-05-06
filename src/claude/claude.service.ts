import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeCompleteInput {
  model: string;
  system?: string | Array<Record<string, unknown>>;
  messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
  maxTokens?: number;
  temperature?: number;
  tools?: Array<Record<string, unknown>>;
  toolChoice?: Record<string, unknown>;
  stopSequences?: string[];
}

export interface ClaudeCompleteResult {
  text: string;
  message: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
}

export interface ClaudeToolRunnerInput extends ClaudeCompleteInput {
  runTool: (name: string, input: unknown) => Promise<unknown>;
  maxToolRounds?: number;
}

export type DocumentMediaType =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp';

export interface ExtractTextFromDocumentInput {
  buffer: Buffer;
  mediaType: DocumentMediaType;
  model?: string;
  maxTokens?: number;
}

export interface ExtractTextFromDocumentResult {
  text: string;
  model: string;
  usage: ClaudeCompleteResult['usage'];
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('anthropic.apiKey'),
    });
  }

  get rawClient(): Anthropic {
    return this.client;
  }

  async complete(input: ClaudeCompleteInput): Promise<ClaudeCompleteResult> {
    const message = await this.client.messages.create({
      model: input.model,
      max_tokens: input.maxTokens ?? 1024,
      system: this.toSystemBlocks(input.system),
      messages: input.messages as any,
      temperature: input.temperature,
      tools: input.tools as any,
      tool_choice: input.toolChoice as any,
      stop_sequences: input.stopSequences,
    } as any);

    return this.toCompleteResult(message);
  }

  async completeWithTools(input: ClaudeToolRunnerInput): Promise<ClaudeCompleteResult> {
    const messages = [...input.messages] as any[];
    const usage = this.emptyUsage();
    let lastMessage: any;

    for (let round = 0; round <= (input.maxToolRounds ?? 4); round += 1) {
      const message = await this.client.messages.create({
        model: input.model,
        max_tokens: input.maxTokens ?? 1024,
        system: this.toSystemBlocks(input.system),
        messages,
        temperature: input.temperature,
        tools: input.tools as any,
        tool_choice: input.toolChoice as any,
      } as any);

      lastMessage = message;
      this.addUsage(usage, message.usage);

      const toolUses = message.content.filter((block: any) => block.type === 'tool_use');
      if (toolUses.length === 0) {
        return this.toCompleteResult(message, usage);
      }

      messages.push({ role: 'assistant', content: message.content });
      messages.push({
        role: 'user',
        content: await Promise.all(
          toolUses.map(async (toolUse: any) => ({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: this.stringifyToolResult(await input.runTool(toolUse.name, toolUse.input)),
          })),
        ),
      });
    }

    this.logger.warn('Claude tool loop reached max rounds');
    return this.toCompleteResult(lastMessage, usage);
  }

  async extractTextFromDocument(input: ExtractTextFromDocumentInput): Promise<ExtractTextFromDocumentResult> {
    const model = input.model ?? 'claude-haiku-4-5';
    const isPdf = input.mediaType === 'application/pdf';
    const sourceBlock = {
      type: 'base64' as const,
      media_type: input.mediaType,
      data: input.buffer.toString('base64'),
    };

    const documentBlock = isPdf
      ? { type: 'document', source: sourceBlock }
      : { type: 'image', source: sourceBlock };

    const message = await this.client.messages.create({
      model,
      max_tokens: input.maxTokens ?? 4096,
      messages: [
        {
          role: 'user',
          content: [
            documentBlock,
            {
              type: 'text',
              text: 'Extrae el texto literal del documento. No resumas, no interpretes, no agregues comentarios. Devuelve SOLO el texto plano tal como aparece. Si el documento esta vacio o ilegible, responde con la palabra exacta: VACIO.',
            },
          ],
        },
      ],
    } as any);

    const result = this.toCompleteResult(message);
    return {
      text: result.text,
      model,
      usage: result.usage,
    };
  }

  async completeJson<T>(input: ClaudeCompleteInput): Promise<{ data: T; raw: ClaudeCompleteResult }> {
    const first = await this.complete(input);
    const parsed = this.tryParseJson<T>(first.text);
    if (parsed.ok) return { data: parsed.data, raw: first };

    this.logger.warn('Claude returned invalid JSON; retrying once');
    const retry = await this.complete({
      ...input,
      messages: [
        ...input.messages,
        { role: 'assistant', content: first.text },
        { role: 'user', content: 'Responde SOLO con JSON valido. Empieza directamente con { sin explicaciones.' },
      ],
    });

    const retryParsed = this.tryParseJson<T>(retry.text);
    if (retryParsed.ok) {
      return { data: retryParsed.data, raw: retry };
    }

    throw new Error('Claude returned invalid JSON after retry');
  }

  private toSystemBlocks(system?: string | Array<Record<string, unknown>>) {
    if (!system) return undefined;
    if (typeof system !== 'string') return system as any;
    return [
      {
        type: 'text',
        text: system,
        cache_control: { type: 'ephemeral' },
      },
    ] as any;
  }

  private toCompleteResult(message: any, usageOverride?: ClaudeCompleteResult['usage']): ClaudeCompleteResult {
    const text = (message?.content ?? [])
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')
      .trim();

    return {
      text,
      message,
      usage: usageOverride ?? {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: (message.usage as any).cache_read_input_tokens ?? 0,
        cacheCreationTokens: (message.usage as any).cache_creation_input_tokens ?? 0,
      },
    };
  }

  private emptyUsage(): ClaudeCompleteResult['usage'] {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    };
  }

  private addUsage(total: ClaudeCompleteResult['usage'], usage: any): void {
    total.inputTokens += usage?.input_tokens ?? 0;
    total.outputTokens += usage?.output_tokens ?? 0;
    total.cacheReadTokens += usage?.cache_read_input_tokens ?? 0;
    total.cacheCreationTokens += usage?.cache_creation_input_tokens ?? 0;
  }

  private stringifyToolResult(result: unknown): string {
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  private tryParseJson<T>(text: string): { ok: true; data: T } | { ok: false; error: Error } {
    const extracted = this.extractJson(text);
    if (!extracted) {
      return { ok: false, error: new Error('No JSON found in response') };
    }
    try {
      return { ok: true, data: JSON.parse(extracted) as T };
    } catch {
      const repaired = this.repairTruncatedJson(extracted);
      if (repaired) {
        try {
          return { ok: true, data: JSON.parse(repaired) as T };
        } catch {
          // fall through
        }
      }
      return { ok: false, error: new Error('JSON parse failed even after repair') };
    }
  }

  private repairTruncatedJson(text: string): string | null {
    let repaired = text.trim();

    const openBraces = (repaired.match(/{/g) ?? []).length;
    const closeBraces = (repaired.match(/}/g) ?? []).length;
    const openBrackets = (repaired.match(/\[/g) ?? []).length;
    const closeBrackets = (repaired.match(/\]/g) ?? []).length;

    for (let i = 0; i < openBrackets - closeBrackets; i += 1) {
      repaired += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i += 1) {
      repaired += '}';
    }

    repaired = repaired.replace(/,\s*([\]}])/g, '$1');

    const lastChar = repaired[repaired.length - 1];
    if (lastChar === ',' || lastChar === ':' || lastChar === '"' || lastChar === '\\') {
      repaired = repaired.slice(0, -1);
      repaired = repaired.replace(/,\s*([\]}])/g, '$1');
      const newOpenBraces = (repaired.match(/{/g) ?? []).length;
      const newCloseBraces = (repaired.match(/}/g) ?? []).length;
      const newOpenBrackets = (repaired.match(/\[/g) ?? []).length;
      const newCloseBrackets = (repaired.match(/\]/g) ?? []).length;
      for (let i = 0; i < newOpenBrackets - newCloseBrackets; i += 1) {
        repaired += ']';
      }
      for (let i = 0; i < newOpenBraces - newCloseBraces; i += 1) {
        repaired += '}';
      }
    }

    if (repaired !== text.trim()) {
      return repaired;
    }
    return null;
  }

  private extractJson(text: string): string | null {
    const trimmed = text.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return trimmed;
    }

    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }

    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      return trimmed.slice(firstBracket, lastBracket + 1);
    }

    return null;
  }
}
