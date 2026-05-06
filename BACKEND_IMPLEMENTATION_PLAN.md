# BACKEND_IMPLEMENTATION_PLAN.md

> Plan ejecutable para 1 desarrollador backend. 12 horas. MVP **El Escudo de Beto**.
> Trabajar en paralelo con `FRONTEND_IMPLEMENTATION_PLAN.md`. Las secciones 4 (Endpoints) y 6 (Modelo) son contrato compartido.

---

## 1. Backend Goal

Dos endpoints principales que demuestran agéntico responsable + MCP genuino:

1. **`POST /api/entity-check`** (rápido, <1s) — verifica si una entidad fintech está en CMF o es **imitadora denunciada**. Usa una **tool MCP-inspired** real para hacer match contra dataset mock de "122 entidades denunciadas en 2025".

2. **`POST /api/analyses`** (8-15s) — orquesta 5 agentes Claude para analizar un contrato/T&C/arriendo/ATD y devolver:
   - `pillars`: { good, bad, red } (Lo Bueno / Lo Malo / Alertas Rojas)
   - `plan`: pasos accionables
   - `letters`: { bank, sernac } — 2 cartas formales
   - `agentRuns`, `sources` con citas verificables

Cubre los 4 escenarios del perfil de Beto (crédito trampa, app estafa, galpón, ATD software).

---

## 2. Current Backend Analysis

**Ubicación:** `/Users/felipemoyano/Documents/CODIGO-STARTUP/impact-lab/backend/`

**Stack:**
- NestJS 10 + TypeScript 5
- `@anthropic-ai/sdk@0.52.0`, `@pinecone-database/pinecone@5.0.0`, `@nestjs/mongoose@10`
- `class-validator` + `class-transformer`
- API prefix: `/api`, port: `3001`

**Estructura actual:**
```
backend/src/
├── main.ts                  # bootstrap, CORS, ValidationPipe global
├── app.module.ts            # importa RagModule + ConfigModule + MongooseModule
├── config/configuration.ts
└── rag/
    ├── rag.controller.ts    # POST /api/rag/ingest, /api/rag/query
    ├── rag.service.ts       # Pinecone + Claude + caching
    ├── rag.module.ts
    └── dto/
```

| Componente | Estado | Acción |
|---|---|---|
| Bootstrap NestJS, CORS, ValidationPipe | ✅ funcional | no tocar |
| `ConfigModule` (`.env`) | ✅ funcional | usar |
| `RagService` (Pinecone + Claude) | ✅ funcional | **reusar como `RegulatoryContextAgent`** |
| Pinecone index `feriapro-rag` | ✅ activo | usar **namespace `legal-chile`** |
| Mongoose | ✅ conectado, sin schemas | crear schemas |
| Claude SDK con prompt caching | ✅ patrón establecido | replicar |
| Auth | ❌ no existe | no se requiere |
| Health check | ❌ no existe | crear |

**.env existente:**
```
ANTHROPIC_API_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=feriapro-rag
MONGODB_URI=mongodb+srv://...
PORT=3001
```

---

## 3. Backend MVP Flow

### 3.1 Flujo `POST /api/entity-check`

```
1. Recibir { name } en EntityCheckController
2. ValidationPipe valida
3. EntityCheckService.check(name)
4. ToolRegistryService.run('check_cmf_imitator', { name })
   → DataSourceService.searchEntity(name)
   → match contra cmf-fixtures.ts (5 legítimas) y denounced-fixtures.ts (122 imitadoras)
5. AuditLogService.log({ type: 'entity_check', input: name, result: ...})
6. Response { name, registered, isImitator, source, evidence?, _mocked: true }
```

### 3.2 Flujo `POST /api/analyses`

```
1. Recibir CreateAnalysisDto
2. ValidationPipe valida
3. AnalysisService.run(dto)
4. PiiValidationService.redact(dto.text) → reemplaza RUTs/emails
5. AgentOrchestratorService.run(redactedDto)
   a. IntakeAgent (Haiku) → { caseType, entities[], language, piiResidual }
   b. RegulatoryContextAgent → RagService.queryRaw('legal-chile', dto.text, 5) → chunks
   c. RiskAnalysisAgent (Sonnet + tool use) → { riskScore, pillars: {good, bad, red}, resultTitle, resultText }
      tools disponibles: search_pinecone_legal, check_cmf_imitator, check_usury_rate, detect_open_finance_clause, check_atd_in_contract
   d. RecommendationAgent (Sonnet) → { plan: string[], letters: { bank?, sernac? } }
   e. ValidatorAgent (Haiku) → filtra pillars con citas inventadas
6. ReportService.assemble() → AnalysisResultDto canónico
7. Persistir analyses + agent_runs + audit_logs
8. Response 200
```

**Latencia objetivo:** entity-check <1s, analyses <15s. Si excede 25s, retornar fixture demo con `meta.mocked=true`.

---

## 4. Endpoints to Implement

### 4.1 `POST /api/entity-check` ⭐ NUEVO (flujo rápido MCP)

| | |
|---|---|
| **Purpose** | Verificar entidad contra CMF mock + lista 122 denunciadas |
| **Request** | `{ name: string }` |
| **Response** | `{ name, registered, isImitator, source, evidence?, _mocked: true }` |
| **Service** | `EntityCheckService.check()` → invoca tool `check_cmf_imitator` |
| **Errors** | 400 (vacío), 500 |
| **Acceptance** | curl `{"name":"Lucas Fácil"}` → `{ isImitator:true, evidence:"1 de las 122 entidades denunciadas..." }` en <1s |

### 4.2 `POST /api/analyses` ⭐ PRINCIPAL

| | |
|---|---|
| **Purpose** | Análisis multi-agent profundo |
| **Request** | `CreateAnalysisDto` (sec 6.1) |
| **Response** | `AnalysisResultDto` con `pillars` y `letters` |
| **Errors** | 400 (validación), 500 (Claude/Pinecone) |
| **Acceptance** | escenario "credito_trampa" → JSON completo con ≥1 item por pilar y carta banco no vacía en ≤15s |

### 4.3 `GET /api/analyses/:id` (P2)

Recupera análisis previo desde Mongo.

### 4.4 `GET /api/data-sources` (P2)

Lista de 6 fuentes catalogadas para mostrar en UI.

### 4.5 `GET /api/health/ai` (P0 — frontend lo usa)

`{ claude, pinecone, mongo: 'ok'|'down' }`.

---

## 5. Backend Services

```
src/
├── analyses/         # endpoint principal
├── entity-check/     # endpoint rápido
├── agents/           # orchestrator + 5 agentes
├── tools/            # tool registry MCP-inspired
├── pii/              # PII redaction
├── data-sources/     # mocks CMF + 122 imitadoras
├── reports/          # JSON canónico
├── audit/
├── health/
├── claude/           # wrapper SDK compartido
└── rag/              # ya existe
```

### 5.1 `EntityCheckService` (nuevo)
- **Methods:** `check(name): Promise<EntityCheckResult>`
- **Deps:** `ToolRegistryService`, `AuditLogService`
- **Acceptance:** retorna match en <1s

### 5.2 `AnalysesService`
- **Methods:** `run(dto)`, `findById(id)`
- **Deps:** `AgentOrchestratorService`, `PiiValidationService`, Mongoose `Analysis`, `AuditLogService`
- **Acceptance:** request → response coherente + persistencia

### 5.3 `AgentOrchestratorService`
- **Methods:** `run(redactedDto): Promise<{...}>`
- Llama 5 agentes secuencialmente, registra cada uno en `agent_runs`

### 5.4 5 Agentes (clases en `src/agents/agents/`)

| Agente | Modelo | Input | Output | Tools |
|---|---|---|---|---|
| `IntakeAgent` | `claude-haiku-4-5` | text | `{ caseType, entities, language, piiResidual }` | none |
| `RegulatoryContextAgent` | (no Claude) | text + caseType | `{ chunks }` | `RagService.queryRaw('legal-chile')` |
| `RiskAnalysisAgent` | `claude-sonnet-4-6` | text + chunks + entity + caseType | `{ riskScore, riskLabel, resultTitle, resultText, pillars }` | sí, `toolRunner` |
| `RecommendationAgent` | `claude-sonnet-4-6` | pillars + caseType + entity | `{ plan, letters: {bank?, sernac?} }` | none |
| `ValidatorAgent` | `claude-haiku-4-5` | pillars + chunks | `{ pillarsValidated }` | none |

Prompts completos en `AI_AGENT_AND_MCP_PLAN.md`.

### 5.5 `ClaudeService` (compartido)
- `complete({ model, system, messages, max_tokens, tools? })`
- `completeWithTools({ model, system, messages, tools, runner })` — usa `client.beta.messages.toolRunner`

### 5.6 `ToolRegistryService` (MCP-inspired) ⭐
- `register(def)`, `list()`, `get(name)`, `toAnthropicTools()`, `runAsClaudeTool(name, input)`
- Tools tipadas con Zod (sección 10)

### 5.7 `PiiValidationService`
Regex para RUT, email, teléfono CL → `[*_REDACTED]`. Method: `redact(text)`.

### 5.8 `ReportService`
Transforma orchestrator output a `AnalysisResultDto`.

### 5.9 `AuditLogService`
`log({ type, analysisId?, details })` — sin PII.

### 5.10 `DataSourceService` (real + mock honesto)
- `lookupCmfEntity(name)` — match contra:
  - **`cmf_registry` (Mongo)** — datos reales de RPSF CSV descargado de `cmfchile.cl/institucional/estadisticas/seg_rgpsf.php` (~179 entidades registradas vigentes)
  - **`cmf_alerts` (Mongo)** — alertas al público scraped una vez de `cmfchile.cl/portal/principal/613/w3-propertyvalue-43545.html` (entidades denunciadas reales)
  - **`denunciadas-extra.fixtures.ts`** — complemento mock plausible para llegar al volumen narrado en pitch (incluye "Lucas Fácil"). Marca cada item con `_mocked: true` si viene de aquí
- `checkPhishTankUrl(url)` — POST a `phishtank.org/check_url` (real, sin auth). Cache local 24h
- `explainLawSimple(numero, articulo?)` — GET a BCN API Ley Fácil `https://www.bcn.cl/api-leyfacil/...` (real, sin auth, JSON)
- `checkUsuryRate(rateAnnual)` — TMC desde Banco Central API BDE (`si3.bcentral.cl/SieteRestWS`, requiere registro gratuito) o fallback hardcoded TMC=27%
- `listSources()` — 8 fuentes catalogadas (4 reales, 4 snapshot/mock)

### 5.11 `HealthService`
Ping Pinecone, Claude (model list), Mongo readyState.

---

## 6. MongoDB Minimal Data Model

### 6.1 `Analysis` (`analyses`)

```ts
@Schema({ timestamps: true })
export class Analysis {
  @Prop() scenario: string;             // 'credito_trampa' | 'app_estafa' | ...
  @Prop() language: string;
  @Prop() entity: string;
  @Prop() documentType: string;
  @Prop() textRedacted: string;         // post-PII
  @Prop({ type: Number }) riskScore: number;
  @Prop() riskLabel: string;
  @Prop() resultTitle: string;
  @Prop() resultText: string;
  @Prop({ type: Object }) pillars: { good: any[]; bad: any[]; red: any[] };
  @Prop({ type: [String] }) plan: string[];
  @Prop({ type: Object }) letters: { bank?: string; sernac?: string };
  @Prop({ type: Array }) sources: any[];
  @Prop({ type: Object }) meta: { piiRedacted: boolean; mocked: boolean; tokenUsage: any };
}
```

**Index:** `{ createdAt: -1 }`.

### 6.2 `AgentRun` (`agent_runs`)

```ts
@Schema({ timestamps: true })
export class AgentRun {
  @Prop({ index: true }) analysisId: string;
  @Prop() agent: string;
  @Prop() model: string;
  @Prop() status: string;          // 'done' | 'warn'
  @Prop() durationMs: number;
  @Prop({ type: Object }) inputSummary: any;
  @Prop({ type: Object }) outputSummary: any;
  @Prop({ type: Object }) tokenUsage: any;
}
```

### 6.3 `AuditLog` (`audit_logs`)

```ts
@Schema({ timestamps: true })
export class AuditLog {
  @Prop() type: string;            // 'analysis_started' | 'pii_redacted' | 'entity_check' | ...
  @Prop() analysisId?: string;
  @Prop({ type: Object }) details: any;
}
```

### 6.4 `EntityCheck` (opcional, P2 — `entity_checks`)

```ts
@Schema({ timestamps: true })
export class EntityCheck {
  @Prop() name: string;
  @Prop() registered: boolean;
  @Prop() isImitator: boolean;
  @Prop() evidence?: string;
}
```

> **No guardar PII bruto.**

---

## 7. Pinecone Minimal Integration

### 7.1 Datos a precargar (~30-40 chunks)

Fuente: `legal.md` + extractos de leyes. Cada chunk con metadata:
```json
{
  "ley": "21.521",
  "articulo": "Art. 23",
  "tema": "Open Finance",
  "url": "https://www.bcn.cl/leychile/navegar?idNorma=1187323",
  "text": "..."
}
```

**Cobertura mínima alineada a los 4 escenarios:**
- **Ley 19.628**: 8 chunks (consentimiento, ARCO, finalidad, calidad, cesión a terceros)
- **Ley 21.719**: 10 chunks (ATD, brechas, sanciones 20.000 UTM, agencia de protección, Art. 35)
- **Ley 21.521**: 8 chunks (Open Finance NCG 514, NCG 502, derechos usuario fintech)
- **Ley 21.398 + 19.496**: 5 chunks (cláusulas abusivas, garantía, plazos, derecho información)
- **Ley 18.010**: 3 chunks (Tasa Máxima Convencional, usura)
- **Ley 21.459**: 2 chunks (fraude informático)

### 7.2 Namespace: `legal-chile`

### 7.3 Script `scripts/preload-legal.ts`

```ts
// pseudocódigo
const chunks = parseLegalMd('../legal.md');
for (const chunk of chunks) {
  await ragService.ingest({
    text: chunk.text,
    metadata: { ley: chunk.ley, articulo: chunk.articulo, url: chunk.url, tema: chunk.tema },
    namespace: 'legal-chile',
  });
}
```

> **Verificar:** `RagService.ingest()` debe aceptar `namespace`. Si no lo soporta, agregarlo al DTO. Pinecone soporta namespace en upsert.

### 7.4 Query en runtime

```ts
const { chunks } = await ragService.queryRaw({
  text: dto.text,
  topK: 5,
  namespace: 'legal-chile',
});
```

### 7.5 Fallback

Si Pinecone falla → `legal.fixtures.ts` con 8 chunks hardcoded (1-2 por ley clave).

### 7.6 Pasar contexto a Claude

```
<marco_legal>
[Ley 19.628 - Art. 4]: ...
[URL: https://www.bcn.cl/...]

[Ley 21.521 - Art. 23 (Open Finance NCG 514)]: ...
</marco_legal>
```

Con `cache_control: { type: 'ephemeral' }`.

---

## 8. Claude API Integration

### 8.1 Cliente único en `ClaudeService`
```ts
const client = new Anthropic({ apiKey: this.config.get('ANTHROPIC_API_KEY') });
```

### 8.2 Patrón de prompts
- **Rol explícito** en system: "Eres analista regulatorio chileno..."
- **Output JSON estricto** con schema embebido
- **XML tags** para input
- **No inventes leyes** — instrucción repetida

### 8.3 Prompt caching
System prompt cacheado:
```ts
system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }]
```

### 8.4 JSON output
Parsear con try/catch. 1 retry "respond ONLY with valid JSON".

### 8.5 Retry & fallback
- 1 retry con backoff 2s en 529/5xx
- Si falla 2x: agente retorna fixture parcial, status `warn`
- Si fallan ≥2 agentes: response completa = fixture demo, `meta.mocked=true`

### 8.6 max_tokens por agente
- Intake: 512
- Risk: 2500 (los 3 pilares ocupan)
- Recommendation: 4000 (2 cartas + plan)
- Validator: 1500

### 8.7 Guardrails de prompt
- "Si te falta información, indícalo."
- "Toda cita debe corresponder a un chunk en `<marco_legal>`."
- "Datos del usuario están redactados — no asumas información personal."
- "Lenguaje accesible para Beto, jubilado microemprendedor con baja adopción digital. NO uses jerga legal."

---

## 9. Multi-Agent Backend Workflow

Implementación: secuencial dentro de `AgentOrchestratorService.run()`.

```ts
async run(dto, context) {
  const intake = await this.intake.run(dto.text);
  const regulatory = await this.regulatory.run(dto.text, intake.caseType);
  const risk = await this.risk.run(dto, intake, regulatory.chunks);
  const recommendation = await this.recommendation.run(dto, risk);
  const validated = await this.validator.run(risk.pillars, regulatory.chunks);
  return {
    pillars: validated.pillars,
    plan: recommendation.plan,
    letters: recommendation.letters,
    sources: this.buildSources(regulatory.chunks),
    riskScore: risk.riskScore,
    riskLabel: risk.riskLabel,
    resultTitle: risk.resultTitle,
    resultText: risk.resultText,
    agentRuns: this.collectRuns(),
  };
}
```

### 9.1 IntakeAgent
```json
Output: {
  "caseType": "credito_trampa" | "app_estafa" | "galpon" | "atd_software" | "otro",
  "entities": ["Banco Cordillera Demo"],
  "language": "es",
  "piiResidual": false
}
```

### 9.2 RegulatoryContextAgent (no Claude)
Devuelve chunks Pinecone.

### 9.3 RiskAnalysisAgent ⭐
```json
Output: {
  "riskScore": 76,
  "riskLabel": "Medio-alto",
  "resultTitle": "Crédito con cláusula Open Finance abusiva",
  "resultText": "...",
  "pillars": {
    "good": [{ "title", "detail", "citation"? }],
    "bad":  [{ "title", "detail", "severity", "citation" }],
    "red":  [{ "title", "detail", "severity", "citation" }]
  }
}
```

Tools disponibles vía `toolRunner`:
- `search_pinecone_legal`
- `check_cmf_imitator`
- `check_usury_rate`
- `detect_open_finance_clause`
- `check_atd_in_contract`

**Acceptance:** ≥1 item en cada pilar; todo lo bad/red con citation.

### 9.4 RecommendationAgent ⭐
```json
Output: {
  "plan": ["No firmes todavía.", "Pide al banco que elimine la cláusula 14.", "..."],
  "letters": {
    "bank": "Asunto: ...\n\n[carta completa 250-400 palabras]\n\nEsta carta es un borrador revisable.",
    "sernac": "Asunto: ...\n\n[reclamo SERNAC 200-350 palabras]\n\nEsta carta es un borrador revisable."
  }
}
```

**Reglas cartas:**
- Banco: cita Ley 19.628 + Ley 21.521 según corresponda
- SERNAC: cita Ley 19.496 + Ley 21.398
- Generar SOLO la(s) que corresponda al caso (ej: galpón → no SERNAC, sí carta dueño; ATD software → no SERNAC, sí carta proveedor)

### 9.5 ValidatorAgent
Filtra pillars cuya `citation.articulo+ley` no aparece en chunks.

---

## 10. MCP-Inspired Tool Registry ⭐

### 10.1 Diseño
```ts
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

class ToolRegistryService {
  register<I, O>(def: ToolDef<I, O>): void;
  list(): ToolDef[];
  get(name): ToolDef | undefined;
  toAnthropicTools(): BetaTool[];
  async runAsClaudeTool(name, input): Promise<any>;
}
```

### 10.2 Tools registradas (10 total)

| Tool | Purpose | Input | Output | Backend | Status |
|---|---|---|---|---|---|
| `search_pinecone_legal` | Chunks legales | `{ query, topK? }` | `{ chunks }` | `RagService.queryRaw('legal-chile')` | **Real** (Pinecone con texto BCN snapshot) |
| `check_cmf_imitator` ⭐ | Match contra registro CMF + alertas | `{ name }` | `{ name, registered, isImitator, evidence?, _mocked? }` | `DataSourceService.lookupCmfEntity()` | **Real** (CSV CMF) + complemento mock |
| `check_phishtank_url` ⭐ NUEVO | Verifica URL contra feed PhishTank | `{ url }` | `{ url, in_database, verified, valid, phish_detail_url? }` | `DataSourceService.checkPhishTankUrl()` | **Real** (API live, sin auth) |
| `explain_law_simple` ⭐ NUEVO | Explicación Beto-friendly desde BCN | `{ numero, articulo? }` | `{ titulo, resumen_simple, url }` | BCN API Ley Fácil JSON | **Real** (API live BCN) |
| `check_usury_rate` | Verifica si tasa supera TMC | `{ rateAnnual }` | `{ exceedsTMC, currentTMC, source }` | Banco Central BDE o fallback hardcoded | **Real** (BCH) o mock |
| `detect_open_finance_clause` | Heurística sobre T&C | `{ text }` | `{ found, matches[] }` | regex/keyword | Real heurístico |
| `check_atd_in_contract` | Verifica ATD presente | `{ text }` | `{ hasATD, missingFields[] }` | regex sobre keywords | Real heurístico |
| `validate_pii` | Escanea PII residual | `{ text }` | `{ clean, found[] }` | `PiiValidationService.scan()` | Real |
| `save_analysis_result` | Persiste | `{ analysisId, payload }` | `{ ok }` | `AnalysesService.update()` | Real |
| `generate_report` | Ensambla JSON | `{ analysisId }` | `AnalysisResultDto` | `ReportService.assemble()` | Real |

> **Tools que el RiskAnalysisAgent invoca activamente vía tool use:** las primeras 7. Las últimas 3 quedan registradas para auditoría/listado.
> **8 de 10 tools usan datos públicos chilenos REALES** (CMF CSV, BCN API, PhishTank, Pinecone con texto BCN). Solo `check_usury_rate` y `denunciadas-extra` son mock honesto.

### 10.3 Llamada con tool use
```ts
const tools = this.registry.toAnthropicTools();
const final = await client.beta.messages.toolRunner({
  model: 'claude-sonnet-4-6',
  max_tokens: 2500,
  system: [{ type: 'text', text: RISK_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
  tools,
  messages: [{ role: 'user', content: userPrompt }],
});
```

`toolRunner` cierra el loop: Claude llama tool → backend ejecuta → Claude continúa.

### 10.4 EntityCheck endpoint usa tools sin Claude
```ts
// EntityCheckService
async check(name) {
  const result = await this.registry.runAsClaudeTool('check_cmf_imitator', { name });
  await this.audit.log({ type: 'entity_check', details: { name, result } });
  return result;
}
```

Esto demuestra que la **tool MCP es invocable independientemente** — no requiere Claude para funcionar. Punto clave para el pitch: "nuestras tools son reutilizables como cualquier MCP server".

---

## 11. Backend Data Sources Strategy (real + mock honesto)

> **Principio:** maximizar datos públicos chilenos REALES. Mock claramente marcado con `_mocked: true` solo donde no hay alternativa viable en 12h.

### 11.1 Snapshots descargables (script pre-hackathon, ~45 min)

`scripts/download-snapshots.ts` baja una vez antes/al inicio del hackathon:

```ts
// pseudocódigo
async function downloadSnapshots() {
  // 1. CMF RPSF CSV (registro oficial entidades reguladas)
  await fetchAndSave(
    'https://www.cmfchile.cl/institucional/estadisticas/seg_rgpsf.php', // o link directo al CSV
    'data/snapshots/cmf-rpsf.csv'
  );

  // 2. CMF Alertas al público (HTML scrape)
  await fetchAndSave(
    'https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-43545.html',
    'data/snapshots/cmf-alertas.html'
  );

  // 3. BCN Ley Chile - texto plano de 6 leyes
  for (const idNorma of [141599, 1187323, 1209272, 1170464, 29438, 1177743]) {
    await fetchAndSave(
      `https://www.bcn.cl/leychile/navegar?idNorma=${idNorma}`,
      `data/snapshots/leychile-${idNorma}.html`
    );
  }

  // 4. ANCI normativa (HTML scrape)
  await fetchAndSave('https://anci.gob.cl/normativa/leyes/', 'data/snapshots/anci-normativa.html');
}
```

**Ingestión:**
- `scripts/ingest-cmf-csv.ts` parsea CSV → carga a Mongo collection `cmf_registry` (~179 docs)
- `scripts/ingest-cmf-alertas.ts` parsea HTML → carga a `cmf_alerts` (~N docs)
- `scripts/preload-legal.ts` parsea HTML BCN + ANCI → chunks → Pinecone `legal-chile` (~36 vectores)

### 11.2 Datos REALES (live)

| Fuente | Endpoint | Auth | Uso |
|---|---|---|---|
| **PhishTank** | `https://phishtank.org/check_url.php` | No | `check_phishtank_url` tool |
| **BCN API Ley Fácil** | `https://www.bcn.cl/api-leyfacil/` | No | `explain_law_simple` tool |
| **Banco Central BDE** | `https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx` | Registro gratis | `check_usury_rate` tool (TMC actualizada) |

> Si no alcanzamos a registrar Banco Central, `check_usury_rate` cae a TMC=27% hardcoded con `source: 'fallback'`.

### 11.3 Mock honesto (con `_mocked: true`)

| Componente | Razón del mock | Implementación |
|---|---|---|
| `denunciadas-extra.fixtures.ts` | Complementar lista CMF con casos plausibles para narrativa pitch (incluye "Lucas Fácil") | ~30 entradas con `_mocked: true` |
| `detect_open_finance_clause` | No existe API pública | regex + keyword (`open finance`, `historial transaccional`, `aliados comerciales`, `terceros`) |
| `check_atd_in_contract` | No existe API pública | keyword presence (`tratamiento de datos`, `responsable del tratamiento`, `finalidad`, `subprocesadores`) |
| Pinecone fallback | Si no se alcanzó preload | `legal.fixtures.ts` con 8 chunks hardcoded |
| Claude fallback | Si ≥2 agentes fallan | fixture demo del escenario, `meta.mocked=true` |

### 11.4 Match logic en `lookupCmfEntity`

```ts
async function lookupCmfEntity(name: string) {
  const norm = name.toLowerCase().trim();

  // 1. Buscar en registro oficial CMF (Mongo)
  const registered = await this.cmfRegistry.findOne({
    nameLower: { $regex: this.escapeRegex(norm) }
  });
  if (registered) return {
    name, registered: true, isImitator: false,
    source: 'CMF RPSF (oficial, snapshot ' + registered.snapshotDate + ')',
    evidence: `Registrada con licencia ${registered.licenseType}`,
  };

  // 2. Buscar en alertas oficiales CMF (Mongo)
  const alert = await this.cmfAlerts.findOne({
    nameLower: { $regex: this.escapeRegex(norm) }
  });
  if (alert) return {
    name, registered: false, isImitator: true,
    source: 'CMF Alertas al Público (oficial, snapshot)',
    evidence: `Alertada por CMF: ${alert.motivo}`,
  };

  // 3. Buscar en complemento mock
  const mock = DENUNCIADAS_EXTRA.find(e => norm.includes(e.name.toLowerCase()));
  if (mock) return {
    name, registered: false, isImitator: true,
    source: 'Dataset complementario',
    evidence: `Reportada en seguimiento de fraudes 2025 (${mock.motivo})`,
    _mocked: true,
  };

  // 4. No encontrada
  return {
    name, registered: false, isImitator: false,
    source: 'CMF RPSF',
    evidence: 'No encontrada — verifica el nombre',
  };
}
```

### 11.5 4 fixtures escenarios completos en `analysis.fixtures.ts`
Para fallback total. Estructura igual que `mockApi.ts` del frontend.

**Loguear** cada mock con `Logger.warn('[MOCK] ...')` para auditoría.

---

## 12. Step-by-Step Backend Tasks

| # | Task | Files | Deps | Acceptance | P | Time |
|---|---|---|---|---|---|---|
| 1 | Verificar `.env`, `npm run start:dev` | none | none | rag/query responde | P0 | 10m |
| 2 | `ClaudeService` (extraer lógica de RagService) | `src/claude/` | T1 | wrappers funcionan | P0 | 30m |
| 3 | `PiiValidationService` con regex | `src/pii/` | none | redacta RUT/email/phone | P0 | 20m |
| 4 | Schemas Mongo (Analysis, AgentRun, AuditLog) | `src/.../schemas/` | T1 | docs creables | P0 | 25m |
| 5 | `AuditLogService` | `src/audit/` | T4 | persiste logs | P0 | 10m |
| 6a | **Snapshot script** (CMF CSV + CMF alertas + BCN HTML + ANCI) | `scripts/download-snapshots.ts` | none | archivos en `data/snapshots/` | P0 | 30m |
| 6b | **Ingest CMF CSV** + alertas a Mongo (`cmf_registry`, `cmf_alerts`) | `scripts/ingest-cmf-*.ts` | T6a, T4 | ~179 docs en Mongo | P0 | 30m |
| 6c | `denunciadas-extra.fixtures.ts` (~30 entradas plausibles, incluye "Lucas Fácil") | `src/data-sources/fixtures/` | none | cargable | P0 | 15m |
| 7 | `DataSourceService` con lookups Mongo + PhishTank live + BCN Ley Fácil live + usury + ATD detection | `src/data-sources/` | T6b, T6c | match Lucas Fácil → imitator; PhishTank verifica URL real | P0 | 50m |
| 8 | `ToolRegistryService` + **10 tools** Zod-typed (incluye `check_phishtank_url`, `explain_law_simple`) | `src/tools/` | T7, T3, RagService | `list()` muestra 10 | P0 | 70m |
| 9 | `EntityCheckController` + `EntityCheckService` ⭐ | `src/entity-check/` | T8 | `POST /api/entity-check` responde | P0 | 25m |
| 10 | `IntakeAgent` (Haiku) | `src/agents/agents/intake.agent.ts` | T2 | clasifica los 4 escenarios | P0 | 35m |
| 11 | `RegulatoryContextAgent` (RAG) | `src/agents/agents/regulatory.agent.ts` | RagService, T8 | retorna chunks | P0 | 25m |
| 12 | `RiskAnalysisAgent` (Sonnet + tool use) ⭐ | `src/agents/agents/risk.agent.ts` | T2, T8 | ≥1 item por pilar con cita | P0 | 75m |
| 13 | `RecommendationAgent` (Sonnet, 2 cartas) | `src/agents/agents/recommendation.agent.ts` | T2 | bank ≥250 palabras | P0 | 50m |
| 14 | `ValidatorAgent` (Haiku) | `src/agents/agents/validator.agent.ts` | T2 | descarta cita inventada | P1 | 30m |
| 15 | `AgentOrchestratorService` | `src/agents/agent-orchestrator.service.ts` | T10-14 | corre 5 agentes | P0 | 30m |
| 16 | `ReportService` | `src/reports/` | T15 | JSON canónico | P0 | 25m |
| 17 | `AnalysesController` + `AnalysesService` + DTOs | `src/analyses/` | T15, T16, T3, T4 | endpoint responde | P0 | 30m |
| 18 | `HealthService` + `HealthController` | `src/health/` | T1 | 3 ok | P0 | 20m |
| 19 | Script `preload-legal.ts` (parsea HTML BCN + ANCI a chunks) + correrlo | `scripts/` | T6a, T1 | ≥30 vectores en namespace `legal-chile` | P0 | 60m |
| 20 | Wire módulos en `AppModule` | `src/app.module.ts` | T9-18 | NestJS arranca | P0 | 15m |
| 21 | Test integral curl: entity-check + analyses | none | T9, T17, T20 | ambos responden bien | P0 | 30m |
| 22 | Fallback fixture si ≥2 agentes fallan | `agent-orchestrator.service.ts` | T15 | Claude key inválida → mock | P1 | 30m |
| 23 | Endpoint `GET /api/analyses/:id` y `GET /api/data-sources` | controllers | T17, T7 | responden | P2 | 25m |
| 24 | Polish logs (correlation ID por request) | varios | T17 | logs `[analysisId=xxx]` | P2 | 20m |

**Total P0:** ~9h (ahora con snapshot pipeline real). **Buffer:** ~3h.

> **Pre-hackathon (idealmente la noche anterior, 30-60 min):** correr `scripts/download-snapshots.ts` para tener CSV CMF + HTML BCN listos. Si no es viable, hacerlo en la primera hora del hackathon.

---

## 13. 12-Hour Backend Timeline

| Bloque | Horas | Foco |
|---|---|---|
| **0:00–0:45** | 45m | **Snapshots: descargar CMF CSV + BCN HTML + ANCI** (T6a) en paralelo a setup (T1) |
| **0:45–1:30** | 45m | ClaudeService + PII + schemas + AuditLog + Ingest CMF (T2-T5, T6b) |
| **1:30–2:00** | 30m | `denunciadas-extra` + DataSourceService base (T6c) |
| **2:00–3:00** | 1h | DataSourceService completo (PhishTank live + BCN Ley Fácil live) + ToolRegistry con 10 tools (T7, T8) |
| **3:00–3:30** | 30m | EntityCheck endpoint ⭐ (T9) — **Quick Action backend funcional con CMF + PhishTank reales** |
| **3:30–4:30** | 1h | IntakeAgent + RegulatoryContextAgent (T10, T11) |
| **4:30–6:30** | 2h | RiskAnalysisAgent con tool use sobre 7 tools ⭐ (T12) — el más complejo |
| **6:30–7:30** | 1h | RecommendationAgent con 2 cartas (T13) |
| **7:30–8:30** | 1h | Orchestrator + Report + AnalysesController + Health + Wire (T15, T16, T17, T18, T20) |
| **8:30–9:30** | 1h | Pinecone preload desde HTML BCN + correrlo (T19) |
| **9:30–10:30** | 1h | Test integral curl + integración con frontend (T21) |
| **10:30–11:30** | 1h | ValidatorAgent + Fallback fixture + endpoints P2 (T14, T22, T23) |
| **11:30–12:00** | 30m | Polish + smoke test + Definition of Done (T24) |

**Hito clave hora 3:30:** `POST /api/entity-check` funciona con CMF real + PhishTank real — Quick Action demo-ready.
**Hito clave hora 8:30:** `POST /api/analyses` responde end-to-end.
**Hora 9:30 en adelante:** Pinecone activo con texto BCN real mejora calidad de citas.

---

## 14. Backend Definition of Done

- [ ] `npm run start:dev` levanta sin errores
- [ ] `GET /api/health/ai` retorna 3 ok
- [ ] `POST /api/entity-check {"name":"Lucas Fácil"}` → `isImitator: true` + evidence (desde CMF Alertas reales o complemento) en <1s
- [ ] `POST /api/entity-check {"name":"BancoEstado"}` → `registered: true` (desde CMF RPSF CSV real) en <1s
- [ ] **PhishTank funcional:** invocar tool `check_phishtank_url` con URL de prueba (ej: cualquier URL del feed) retorna respuesta real
- [ ] **BCN Ley Fácil funcional:** invocar tool `explain_law_simple { numero: "21.521" }` retorna JSON con resumen
- [ ] **CMF CSV cargado:** `cmf_registry` collection tiene ≥150 docs (snapshot real)
- [ ] `POST /api/analyses` con escenario `credito_trampa` responde 200 en ≤15s
- [ ] Response cumple shape exacto de `AnalysisResultDto`
- [ ] `pillars.good`, `pillars.bad`, `pillars.red` cada uno con ≥1 item; bad/red con citation válida
- [ ] `letters.bank` ≥250 palabras, `letters.sernac` ≥200 palabras (cuando aplique)
- [ ] `agentRuns` tiene 4-5 entradas
- [ ] Mongo `analyses`, `agent_runs`, `audit_logs` poblados
- [ ] PII redacta RUTs antes de Claude (verificar logs)
- [ ] Pinecone `legal-chile` namespace ≥30 vectores
- [ ] `ToolRegistryService.list()` muestra 10 tools tipadas (8 reales + 2 heurísticos)
- [ ] Fallback funciona con Claude key inválida (`meta.mocked=true`)
- [ ] CORS abierto a `localhost:3000`
- [ ] Sin secrets en logs
