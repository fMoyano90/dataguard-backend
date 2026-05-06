import { Scenario } from './create-analysis.dto';

export type Severity = 'Bajo' | 'Medio' | 'Alto';
export type RiskLabel = 'Bajo' | 'Medio' | 'Medio-alto' | 'Alto';
export type AgentName = 'intake' | 'regulatory' | 'risk' | 'recommendation' | 'validator';

export interface CitationDto {
  articulo: string;
  ley: string;
  url: string;
}

export interface PillarItemDto {
  title: string;
  detail: string;
  citation?: CitationDto;
  severity?: Severity;
}

export interface PillarsDto {
  good: PillarItemDto[];
  bad: PillarItemDto[];
  red: PillarItemDto[];
}

export interface SourceDto {
  name: string;
  type: 'legal' | 'public' | 'document' | 'mock';
  snippet?: string;
  url?: string;
}

export interface AgentRunDto {
  agent: AgentName;
  model: string;
  durationMs: number;
  status: 'done' | 'warn';
}

export interface AnalysisResultDto {
  id: string;
  scenario: Scenario;
  riskScore: number;
  riskLabel: RiskLabel;
  resultTitle: string;
  resultText: string;
  pillars: PillarsDto;
  plan: string[];
  letters: {
    bank?: string;
    sernac?: string;
  };
  sources: SourceDto[];
  agentRuns: AgentRunDto[];
  meta: {
    processedAt: string;
    zeroStorage: true;
    piiRedacted: boolean;
    mocked: boolean;
    tokenUsage?: Record<string, unknown>;
  };
}
