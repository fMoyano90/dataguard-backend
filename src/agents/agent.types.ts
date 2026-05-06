export type AgentStatus = 'done' | 'warn';

export interface AgentRunSummary {
  agent: string;
  model: string;
  status: AgentStatus;
  durationMs: number;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  tokenUsage?: Record<string, unknown>;
}

export interface AgentResult<T> {
  data: T;
  run: AgentRunSummary;
}

export type CaseType = 'credito_trampa' | 'app_estafa' | 'galpon' | 'atd_software' | 'otro';

export interface IntakeAgentInput {
  textRedacted: string;
  scenario?: CaseType | string;
  entity?: string;
  language?: string;
}

export interface IntakeAgentOutput {
  caseType: CaseType;
  entities: string[];
  language: 'es' | 'kreyol' | 'quechua' | 'en';
  piiResidual: boolean;
}

export interface LegalChunk {
  id: string;
  ley: string;
  articulo: string;
  tema?: string;
  text: string;
  url: string;
  score?: number;
  source?: string;
  mocked?: boolean;
}

export interface RegulatoryContextAgentInput {
  textRedacted: string;
  caseType: CaseType;
  entity?: string;
  topK?: number;
}

export interface RegulatoryContextAgentOutput {
  chunks: LegalChunk[];
  source: 'pinecone' | 'fixture';
}

export interface Citation {
  articulo: string;
  ley: string;
  url: string;
}

export type RiskLabel = 'Bajo' | 'Medio' | 'Medio-alto' | 'Alto';
export type Severity = 'Bajo' | 'Medio' | 'Alto';

export interface GoodPillarItem {
  title: string;
  detail: string;
  citation?: Citation;
}

export interface RiskPillarItem {
  title: string;
  detail: string;
  severity: Severity;
  citation?: Citation;
}

export interface RiskPillars {
  good: GoodPillarItem[];
  bad: RiskPillarItem[];
  red: RiskPillarItem[];
}

export interface RiskAnalysisAgentInput {
  textRedacted: string;
  caseType: CaseType;
  entity?: string;
  chunks: LegalChunk[];
}

export interface RiskAnalysisAgentOutput {
  riskScore: number;
  riskLabel: RiskLabel;
  resultTitle: string;
  resultText: string;
  pillars: RiskPillars;
}

export interface RecommendationLetters {
  bank: string | null;
  sernac: string | null;
}

export interface RecommendationAgentInput {
  textRedacted: string;
  caseType: CaseType;
  entity?: string;
  pillars: RiskPillars;
}

export interface RecommendationAgentOutput {
  plan: string[];
  letters: RecommendationLetters;
}

export interface ValidatorAgentInput {
  chunks: LegalChunk[];
  pillars: RiskPillars;
}

export interface ValidatorAgentOutput {
  pillars: RiskPillars;
}

export interface AgentOrchestratorInput {
  textRedacted: string;
  scenario?: CaseType | string;
  entity?: string;
  language?: string;
}

export interface AgentOrchestratorOutput {
  caseType: CaseType;
  entities: string[];
  language: 'es' | 'kreyol' | 'quechua' | 'en';
  riskScore: number;
  riskLabel: RiskLabel;
  resultTitle: string;
  resultText: string;
  pillars: RiskPillars;
  plan: string[];
  letters: RecommendationLetters;
  runs: AgentRunSummary[];
}
