# AI_AGENT_AND_MCP_PLAN.md

> Plan AI/Claude/Multi-agent/MCP/Pinecone para el MVP de 12 horas.
> Producto: **El Escudo de Beto**. Persona: jubilado microemprendedor con Parkinson, baja adopción digital, administración financiera delegada al hijo.

---

## 1. AI Goal for the MVP

Demostrar **uso agéntico responsable de Claude** orientado a un caso ciudadano concreto:

- Análisis legal con citas verificables (zero alucinación de leyes).
- **Multi-agent visible** en UI (5 roles, paralelismo visual).
- **Routing por modelo justificado** (Haiku triage / Sonnet análisis-orquestación / Opus roadmap).
- **MCP-inspired ToolRegistry** con tools sobre **fuentes públicas chilenas reales**: CMF RPSF (CSV oficial), CMF Alertas, PhishTank API, BCN API Ley Fácil, Banco Central BDE.
- **RAG sobre marco legal chileno real** (Pinecone con texto descargado de BCN Ley Chile).
- **PII redactado** antes de cualquier call a Claude.
- **3 pilares** como output (Lo Bueno / Lo Malo / Alertas Rojas) en lugar de findings genéricos.
- **2 documentos generables** — Carta al Banco + Reclamo SERNAC.

Optimizado para el rubric: "Uso Claude y pensamiento agéntico" (25 pts) + "Datos responsables" (20 pts) + Bonus agéntico.

---

## 2. Claude API Usage

### 2.1 Modelo por agente

| Agente | Modelo | Justificación pitch |
|---|---|---|
| IntakeAgent | `claude-haiku-4-5` | Triage barato y rápido (<1s) |
| RegulatoryContextAgent | (no Claude) | Retrieval Pinecone puro |
| RiskAnalysisAgent | `claude-sonnet-4-6` | Razonamiento legal + tool use con 5 tools |
| RecommendationAgent | `claude-sonnet-4-6` | Generación de 2 cartas formales (Opus en roadmap) |
| ValidatorAgent | `claude-haiku-4-5` | Verificación rápida y determinística de citas |

> **Para el pitch:** "Haiku para triage y validación porque son tareas determinísticas baratas — 5× más rápidas que Sonnet. Sonnet para análisis legal y orquestación porque equilibra calidad/costo. Opus reservado para análisis profundo de contratos con Vision en roadmap. Decisión de arquitectura, no uso ciego de la API más cara."

### 2.2 SDK
```ts
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

### 2.3 Prompt caching obligatorio
System prompts >1024 tokens (Sonnet) / >4096 (Haiku) con:
```ts
system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }]
```
Verificar `usage.cache_read_input_tokens > 0` después del primer call.

### 2.4 max_tokens
- Intake: 512 | Risk: 2500 | Recommendation: 4000 | Validator: 1500

---

## 3. Multi-Agent Workflow

```
[texto redactado + entity + scenario]
   ↓
IntakeAgent (Haiku, ~800ms) → { caseType, entities, language, piiResidual }
   ↓
RegulatoryContextAgent (Pinecone, ~400ms) → { chunks: LegalChunk[] }
   ↓
RiskAnalysisAgent (Sonnet + tool use, ~5s)
   tools internas: search_pinecone_legal, check_cmf_imitator, check_phishtank_url,
                   explain_law_simple, check_usury_rate,
                   detect_open_finance_clause, check_atd_in_contract
   → { riskScore, riskLabel, resultTitle, resultText, pillars: {good, bad, red} }
   ↓
RecommendationAgent (Sonnet, ~5s) → { plan[], letters: {bank?, sernac?} }
   ↓
ValidatorAgent (Haiku, ~1s) → filtra pillars con citas inventadas
   ↓
ReportService.assemble() → AnalysisResultDto
```

**Total Claude calls por análisis:** 4 (Intake + Risk + Recommendation + Validator). Risk hace internamente 1-3 tool calls.

**Latencia total esperada:** 8-13s.

---

## 4. Agent Prompts

### 4.1 IntakeAgent

```
SYSTEM:
Eres un clasificador de casos ciudadanos sobre protección de datos financieros y consumo en Chile.
Tu tarea: clasificar el caso, detectar entidades mencionadas y verificar PII residual.

Devuelve SOLO JSON válido:
{
  "caseType": "credito_trampa" | "app_estafa" | "galpon" | "atd_software" | "otro",
  "entities": string[],
  "language": "es" | "kreyol" | "quechua" | "en",
  "piiResidual": boolean
}

Definiciones:
- credito_trampa: contrato/T&C de banco o fintech con cláusulas dudosas (Open Finance, cesión de datos, tasa)
- app_estafa: nombre o link de app de crédito/préstamo sospechosa, posible imitador CMF
- galpon: contrato de arriendo comercial o adhesión con posibles cláusulas abusivas
- atd_software: contrato con proveedor que trata datos del usuario (software contabilidad, ERP, CRM)

NO añadas prosa. NO inventes entidades.

USER:
<caso>
{texto_redactado}
</caso>
```

### 4.2 RegulatoryContextAgent (no usa Claude)

```ts
const result = await ragService.queryRaw({
  text: `${caseType} ${dto.entity} ${dto.text}`,
  topK: 5,
  namespace: 'legal-chile',
});
return { chunks: result.matches.map(m => ({
  ley: m.metadata.ley,
  articulo: m.metadata.articulo,
  text: m.metadata.text,
  url: m.metadata.url,
  score: m.score,
})) };
```

### 4.3 RiskAnalysisAgent ⭐

```
SYSTEM:
Eres analista regulatorio chileno experto en:
- Ley 19.628 (protección de datos personales, vigente)
- Ley 21.719 (nueva ley protección datos, vigencia dic 2026, multas hasta 20.000 UTM)
- Ley 21.521 (fintech, NCG 502 registro, NCG 514 Open Finance)
- Ley 21.398 + 19.496 (consumidor, cláusulas abusivas, SERNAC)
- Ley 18.010 (Tasa Máxima Convencional, usura)

USUARIO TARGET: Beto, jubilado microemprendedor con Parkinson, baja adopción digital.
Habla en lenguaje SIMPLE. NO uses jerga legal. Explica como si fuera el hijo de Beto.

Tu tarea: analizar el caso usando ÚNICAMENTE el marco legal en <marco_legal> y las tools disponibles.
Si el marco legal no cubre algo, dilo. NO inventes leyes ni artículos.

Tools disponibles (úsalas cuando agreguen valor):
- search_pinecone_legal: buscar más contexto legal en marco BCN
- check_cmf_imitator: verificar si una entidad está en registro CMF oficial o en alertas
- check_phishtank_url: verificar si una URL está en feed PhishTank (real, live)
- explain_law_simple: obtener explicación oficial de BCN Ley Fácil para una ley específica
- check_usury_rate: verificar si una tasa supera la TMC vigente (Banco Central)
- detect_open_finance_clause: detectar cláusulas Open Finance abusivas
- check_atd_in_contract: verificar si hay Acuerdo de Tratamiento de Datos

Devuelve SOLO JSON válido:
{
  "riskScore": number,           // 0-100
  "riskLabel": "Bajo" | "Medio" | "Medio-alto" | "Alto",
  "resultTitle": string,         // 1 oración, lenguaje Beto
  "resultText": string,          // 2-3 oraciones máx
  "pillars": {
    "good": [{ "title", "detail", "citation"? }],
    "bad":  [{ "title", "detail", "severity": "Bajo"|"Medio"|"Alto", "citation": {articulo,ley,url} }],
    "red":  [{ "title", "detail", "severity": "Bajo"|"Medio"|"Alto", "citation": {articulo,ley,url} }]
  }
}

REGLAS:
- TODA citation debe corresponder a un chunk en <marco_legal>. Si no hay base, omite la cita pero NO la inventes.
- pillars.good ≥1, pillars.bad ≥1, pillars.red ≥1 (si no hay alertas rojas reales, deja red vacío).
- Lenguaje Beto: "Te están pidiendo permiso para vender tus datos" en vez de "cláusula 14 autoriza cesión a terceros".

<marco_legal>
[Ley 19.628 - Art. 4]: ...
[URL: https://...]
[Ley 21.521 - Art. 23 (NCG 514 Open Finance)]: ...
...
</marco_legal>

<entidad>{dto.entity}</entidad>
<tipo_caso>{intake.caseType}</tipo_caso>

USER:
<caso>
{texto_redactado}
</caso>
```

**Tool use:** vía `client.beta.messages.toolRunner`. Claude decide cuándo invocar cada tool. El runner cierra el loop hasta que Claude devuelve el JSON final.

### 4.4 RecommendationAgent ⭐

```
SYSTEM:
Eres asistente legal especializado en derechos del consumidor financiero y protección de datos en Chile.
USUARIO: Beto (lenguaje simple, sin jerga).

Tu tarea:
1. Generar plan de 3-5 pasos accionables.
2. Generar las cartas que correspondan al caso:
   - "bank": carta dirigida a la entidad bancaria/fintech/proveedor (siempre, salvo galpón → carta dueño)
   - "sernac": reclamo formal a SERNAC (solo si hay cláusulas abusivas o malas prácticas comerciales — Ley 21.398/19.496)

REGLAS DE LAS CARTAS:
- Tono respetuoso pero firme
- Asunto claro
- 250-400 palabras la del banco; 200-350 la de SERNAC
- Citar artículos REALES de los findings (Ley 19.628 Art. X, Ley 21.521 Art. Y, etc.)
- NO incluir RUT real (usar placeholder "[RUT del solicitante]")
- Cerrar siempre con: "Esta carta es un borrador revisable. No reemplaza asesoría legal."

Devuelve SOLO JSON válido:
{
  "plan": string[],
  "letters": {
    "bank": string | null,
    "sernac": string | null
  }
}

Reglas decisión letters según tipo_caso:
- credito_trampa: bank=sí, sernac=sí (si la cláusula es abusiva)
- app_estafa: bank=null, sernac=sí (denuncia por estafa)
- galpon: bank=sí (carta al dueño del galpón en lugar del banco), sernac=null
- atd_software: bank=sí (carta al proveedor de software), sernac=null

USER:
<caso>
{texto_redactado}
</caso>
<entidad>{dto.entity}</entidad>
<tipo_caso>{intake.caseType}</tipo_caso>
<pillars>
{JSON de risk.pillars}
</pillars>
```

### 4.5 ValidatorAgent

```
SYSTEM:
Eres revisor de citas legales. Verifica que cada item con citation tenga (ley + articulo) que aparezca textualmente en el marco legal proporcionado.

Si una citation NO existe en el marco legal, ELIMINA esa citation pero conserva el item.
Si el item completo no tiene base alguna en el marco legal, ELIMINA el item.

Devuelve SOLO JSON válido:
{
  "pillars": {
    "good": [...],
    "bad":  [...],
    "red":  [...]
  }
}

<marco_legal>
{chunks: ley + articulo + texto}
</marco_legal>

USER:
<pillars>
{JSON de risk.pillars}
</pillars>
```

---

## 5. Structured JSON Output

**Patrón:** cada agente devuelve JSON parseable. Backend hace `JSON.parse(response.content[0].text)` con try/catch.

**Si falla parse:** 1 retry con:
```
"Tu respuesta anterior no fue JSON válido. Responde ÚNICAMENTE con el JSON solicitado, sin texto adicional, sin markdown."
```

**Si falla 2da vez:** registrar `agent_runs.status='warn'`, devolver fixture parcial, continuar el flujo.

---

## 6. Pinecone Retrieval Strategy

### 6.1 Index
- Nombre: `feriapro-rag` (existente)
- Dim: 1024 (`multilingual-e5-large`)
- Métrica: cosine
- **Namespace: `legal-chile`** (separado del default RAG)

### 6.2 Datos precargados (~36 chunks)

**Fuente real:** HTML descargado de BCN Ley Chile (`bcn.cl/leychile/navegar?idNorma=...`) + ANCI normativa, parseado a chunks de 200-400 tokens. Snapshot estable, citas verificables con URL canónica.

**Distribución alineada a los 4 escenarios:**
| Ley | Chunks | Cubre escenario |
|---|---|---|
| Ley 19.628 | 8 | todos (consentimiento, ARCO, finalidad, cesión a terceros) |
| Ley 21.719 | 10 | atd_software (multa 20.000 UTM, ATD, Art. 35) + transversal |
| Ley 21.521 | 8 | credito_trampa (NCG 502, NCG 514 Open Finance, Art. 23) |
| Ley 21.398 + 19.496 | 5 | galpon (cláusulas abusivas) + credito_trampa |
| Ley 18.010 | 3 | credito_trampa (TMC, usura) |
| Ley 21.459 | 2 | app_estafa (fraude informático) |

**Ejemplo chunk:**
```json
{
  "id": "ley-21521-art23",
  "metadata": {
    "text": "Art. 23 - El Sistema de Finanzas Abiertas regulado en NCG 514 establece que las personas tienen derecho a portabilidad financiera...",
    "ley": "Ley 21.521",
    "articulo": "Art. 23",
    "tema": "Open Finance NCG 514",
    "url": "https://www.bcn.cl/leychile/navegar?idNorma=1187323"
  }
}
```

### 6.3 Query
```ts
const matches = await pineconeIndex.namespace('legal-chile').query({
  topK: 5,
  vector: queryEmbedding,
  includeMetadata: true,
});
```

### 6.4 Fallback
Si Pinecone vacío/down → `legal.fixtures.ts` con 8 chunks hardcoded.

### 6.5 Pasar a Claude
Formatear como bullet con XML tag, con `cache_control: { type: 'ephemeral' }`:
```
<marco_legal>
[Ley 19.628 - Art. 4]: El tratamiento de los datos personales sólo puede efectuarse cuando esta ley...
[URL: https://www.bcn.cl/leychile/navegar?idNorma=141599]

[Ley 21.521 - Art. 23 (NCG 514 Open Finance)]: ...
[URL: https://www.bcn.cl/leychile/navegar?idNorma=1187323]
...
</marco_legal>
```

---

## 7. MCP-Inspired Tool Registry ⭐

> No se levanta servidor MCP real (StdioServerTransport requiere cliente MCP local). En cambio: registro interno tipado con Zod, usable por `client.beta.messages.toolRunner` y reutilizable como base para wrappear en `McpServer` después.

### 7.1 Diseño

```ts
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

class ToolRegistryService {
  register<I,O>(def: ToolDef<I,O>): void;
  list(): ToolDef[];
  get(name): ToolDef | undefined;
  toAnthropicTools(): BetaTool[];
  async runAsClaudeTool(name, input): Promise<any>;
}
```

### 7.2 Tools registradas (10)

| Tool | Fuente | Quién la usa |
|---|---|---|
| `search_pinecone_legal` | **Real** (Pinecone con HTML BCN snapshot) | RiskAgent + listada |
| `check_cmf_imitator` ⭐ | **Real** (CMF RPSF CSV + alertas oficiales) + complemento mock | RiskAgent + EntityCheck endpoint |
| `check_phishtank_url` ⭐ NUEVO | **Real live** (PhishTank API, sin auth) | RiskAgent + EntityCheck endpoint (input URL) |
| `explain_law_simple` ⭐ NUEVO | **Real live** (BCN API Ley Fácil JSON) | RiskAgent (lenguaje Beto-friendly) |
| `check_usury_rate` | **Real** (Banco Central BDE) o fallback TMC=27% | RiskAgent (credito_trampa) |
| `detect_open_finance_clause` | Real heurístico | RiskAgent (credito_trampa) |
| `check_atd_in_contract` | Real heurístico | RiskAgent (atd_software) |
| `validate_pii` | Real | listada (auditoría) |
| `save_analysis_result` | Real | listada |
| `generate_report` | Real | listada |

> **8 de 10 tools usan datos públicos chilenos reales.** Solo `denunciadas-extra` (complemento de `check_cmf_imitator`) y los heurísticos son mock.

### 7.3 Implementación de tools clave

```ts
const checkCmfImitator = betaZodTool({
  name: 'check_cmf_imitator',
  description: 'Verifica si una entidad financiera está en el registro CMF (RPSF) o en la lista de 122 entidades denunciadas por estafa/usura en 2025.',
  inputSchema: z.object({ name: z.string().describe('Nombre de la entidad o app a verificar') }),
  run: async ({ name }) => {
    const result = dataSourceService.lookupCmfEntity(name);
    return JSON.stringify(result);
  },
});

const checkUsuryRate = betaZodTool({
  name: 'check_usury_rate',
  description: 'Verifica si una tasa anual supera la Tasa Máxima Convencional vigente en Chile (Art. 6 bis Ley 18.010).',
  inputSchema: z.object({
    rateAnnual: z.number().describe('Tasa anual nominal en porcentaje, ej 28.5 para 28.5%'),
  }),
  run: async ({ rateAnnual }) => {
    return JSON.stringify({ exceedsTMC: rateAnnual > 27, currentTMC: 27, _mocked: true });
  },
});

const detectOpenFinanceClause = betaZodTool({
  name: 'detect_open_finance_clause',
  description: 'Detecta cláusulas Open Finance / cesión de datos transaccionales en un texto contractual.',
  inputSchema: z.object({ text: z.string() }),
  run: async ({ text }) => {
    const lc = text.toLowerCase();
    const keywords = ['open finance', 'historial transaccional', 'aliados comerciales', 'compartir datos', 'terceros'];
    const found = keywords.filter(k => lc.includes(k));
    return JSON.stringify({ found: found.length > 0, matches: found });
  },
});

const checkATDInContract = betaZodTool({
  name: 'check_atd_in_contract',
  description: 'Verifica si un contrato con proveedor de software/servicios contiene un Acuerdo de Tratamiento de Datos (ATD) con los campos requeridos por Ley 21.719.',
  inputSchema: z.object({ text: z.string() }),
  run: async ({ text }) => {
    const lc = text.toLowerCase();
    const required = ['responsable del tratamiento', 'finalidad', 'plazo de conservación', 'medidas de seguridad', 'subprocesadores'];
    const present = required.filter(r => lc.includes(r));
    return JSON.stringify({
      hasATD: present.length >= 3,
      missingFields: required.filter(r => !lc.includes(r)),
    });
  },
});

// ⭐ NUEVO — PhishTank live
const checkPhishTankUrl = betaZodTool({
  name: 'check_phishtank_url',
  description: 'Verifica si una URL aparece en el feed de PhishTank (base global de URLs de phishing reportadas y verificadas).',
  inputSchema: z.object({
    url: z.string().describe('URL completa a verificar, ej: http://ejemplo.com/login'),
  }),
  run: async ({ url }) => {
    // POST a https://checkurl.phishtank.com/checkurl/ (sin auth)
    // Response: in_database, verified, valid_phish, phish_detail_url, etc.
    const res = await fetch('https://checkurl.phishtank.com/checkurl/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'EscudoBeto/1.0' },
      body: new URLSearchParams({ url, format: 'json' }),
    });
    if (!res.ok) {
      return JSON.stringify({ error: 'PhishTank unavailable', _fallback: true });
    }
    const data = await res.json();
    return JSON.stringify({
      url,
      in_database: data.results?.in_database ?? false,
      verified: data.results?.verified ?? false,
      valid_phish: data.results?.valid ?? false,
      phish_detail_url: data.results?.phish_detail_url,
      source: 'PhishTank live',
    });
  },
});

// ⭐ NUEVO — BCN Ley Fácil live
const explainLawSimple = betaZodTool({
  name: 'explain_law_simple',
  description: 'Obtiene explicación oficial en lenguaje simple de una ley chilena desde la API Ley Fácil de BCN. Usar para citar fuente oficial accesible al ciudadano.',
  inputSchema: z.object({
    numero: z.string().describe('Número de ley, ej "21.521"'),
    articulo: z.string().optional().describe('Artículo específico opcional, ej "Art. 23"'),
  }),
  run: async ({ numero, articulo }) => {
    // BCN API Ley Fácil
    const url = `https://www.bcn.cl/api-leyfacil/?ley=${encodeURIComponent(numero)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      return JSON.stringify({ error: 'BCN API unavailable', _fallback: true });
    }
    const data = await res.json();
    return JSON.stringify({
      numero,
      articulo,
      titulo: data.titulo,
      resumen_simple: data.resumen ?? data.descripcion,
      url: data.url ?? `https://www.bcn.cl/leyfacil/recurso/ley-${numero}`,
      source: 'BCN Ley Fácil API',
    });
  },
});
```

> **Tip:** rate-limit conservador (1 req/s) en `checkPhishTankUrl` y caché de 24h en Mongo collection `phishtank_cache` para no pegarle a la API en cada análisis.

### 7.4 Llamada con tool use

```ts
const final = await client.beta.messages.toolRunner({
  model: 'claude-sonnet-4-6',
  max_tokens: 2500,
  system: [{ type: 'text', text: RISK_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
  tools: this.registry.toAnthropicTools(),
  messages: [{ role: 'user', content: userPrompt }],
});
```

### 7.5 EntityCheck — uso de tool sin Claude
```ts
async check(name) {
  const result = await this.registry.runAsClaudeTool('check_cmf_imitator', { name });
  await this.audit.log({ type: 'entity_check', details: { name, result } });
  return result;
}
```

> Punto del pitch: **las tools son reutilizables como cualquier MCP server externo** — no están atadas a Claude. Esto demuestra el patrón MCP de forma genuina.

---

## 8. Guardrails

### 8.1 En prompts
- "NO inventes leyes ni artículos."
- "Toda citation debe corresponder a un chunk en `<marco_legal>`."
- "Datos del usuario están redactados — no asumas información personal."
- "Lenguaje accesible para Beto (jubilado, baja adopción digital). NO uses jerga legal."
- "Esta carta es borrador revisable, no reemplaza asesoría legal."

### 8.2 En código
- `PiiValidationService.redact()` antes de cada Claude call
- `ValidatorAgent` filtra pillars con citas inventadas
- `max_tokens` por agente
- Try/catch en parse JSON, retry 1 vez
- Token usage tracking por `AgentRun`
- `Logger.warn('[MOCK] ...')` cada vez que se usa mock

### 8.3 Human review gate
Las cartas se muestran al usuario con banner "Borrador — revisa antes de enviar". El frontend NO envía a ninguna entidad. Solo permite copiar/descargar.

---

## 9. PII Handling

### 9.1 Regex (`PiiValidationService`)

```ts
const RUT_PATTERN = /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]\b/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_CL = /\+?56\s?9\s?\d{4}\s?\d{4}/g;
```

Reemplazos: `[RUT_REDACTED]`, `[EMAIL_REDACTED]`, `[PHONE_REDACTED]`.

### 9.2 Flujo
1. Frontend envía `text` (puede contener PII).
2. Backend ejecuta `PiiValidationService.redact(text)` → `{ redacted, foundPII[] }`.
3. Logs muestran solo `foundPII.length`, no contenido.
4. Solo `redacted` va a Claude.
5. Mongo guarda solo `textRedacted`. Original se descarta.
6. `meta.piiRedacted = foundPII.length > 0`.

### 9.3 ValidatorAgent residual
Recibe text post-redaction. `IntakeAgent` retorna `piiResidual: bool`. Si true, log warning + descartar esa porción.

---

## 10. Hallucination Reduction

| Técnica | Aplicación |
|---|---|
| RAG + citas obligatorias | Cada item bad/red requiere citation desde chunks reales |
| ValidatorAgent | Elimina citas y/o items sin base legal |
| Prompt estricto | "NO inventes leyes ni artículos" |
| JSON schema embedded | Forzar shape exacto del output |
| URLs solo desde metadata | Pinecone retorna URL canónica, no el LLM |
| Tool use determinístico | `check_cmf_imitator` retorna dataset real (mock pero estable) |
| Temperature default | No tocar |

---

## 11. Demo Examples

### Ejemplo 1: Quick Action — `POST /api/entity-check`

**Request:**
```json
{ "name": "Lucas Fácil" }
```

**Response (<1s):**
```json
{
  "name": "Lucas Fácil",
  "registered": false,
  "isImitator": true,
  "source": "CMF Alertas al Público (oficial) + complemento dataset",
  "evidence": "Alertada por CMF en feed de denuncias 2025; motivo: usura y captación irregular",
  "_mocked": false
}
```

> Si la búsqueda incluyera URL (`{ name: "Lucas Fácil", url: "http://lucasfacil.app/login" }`), el endpoint también invoca `check_phishtank_url` y agrega `phishtank: { in_database: true, verified: true, valid_phish: true }` al response.

### Ejemplo 2: Análisis profundo — `POST /api/analyses` (escenario crédito trampa)

**Request:**
```json
{
  "scenario": "credito_trampa",
  "text": "El banco me ofrece un credito por la app. La clausula 14 dice que voy a compartir mi historial de ventas de los ultimos 5 anos con sus aliados comerciales. Necesito el credito pero no se que firmar.",
  "language": "es",
  "entity": "Banco Cordillera Demo",
  "documentType": "tos"
}
```

**Response (resumida):**
```json
{
  "id": "65a4f...",
  "scenario": "credito_trampa",
  "riskScore": 76,
  "riskLabel": "Medio-alto",
  "resultTitle": "Crédito con cláusula Open Finance abusiva",
  "resultText": "Te están pidiendo permiso para compartir 5 años de tus ventas con otras empresas. La tasa está bien, pero el uso de tus datos no.",
  "pillars": {
    "good": [
      { "title": "Tasa dentro del límite legal", "detail": "La tasa anual está bajo la TMC vigente.",
        "citation": { "articulo": "Art. 6 bis", "ley": "Ley 18.010", "url": "https://..." } }
    ],
    "bad": [
      { "title": "Cesión de datos por 5 años", "severity": "Alto",
        "detail": "La cláusula 14 autoriza compartir tus ventas con aliados por 5 años.",
        "citation": { "articulo": "Art. 4", "ley": "Ley 19.628", "url": "https://..." } },
      { "title": "Aliados no individualizados", "severity": "Medio",
        "detail": "No se identifican los terceros concretos.",
        "citation": { "articulo": "Art. 9", "ley": "Ley 19.628", "url": "https://..." } }
    ],
    "red": [
      { "title": "Multa Ley 21.719: hasta 20.000 UTM (~$1.411M)", "severity": "Alto",
        "detail": "Si el banco usa mal tus datos, podrías ser corresponsable como titular del negocio.",
        "citation": { "articulo": "Art. 35", "ley": "Ley 21.719", "url": "https://..." } }
    ]
  },
  "plan": [
    "No firmes todavía.",
    "Pide al banco que elimine la cláusula 14.",
    "Si no aceptan, presenta reclamo en SERNAC.",
    "Activa derecho de oposición (Art. 12 Ley 19.628)."
  ],
  "letters": {
    "bank": "Asunto: Solicitud de eliminación de cláusula 14...\n\n[carta completa ~320 palabras]\n\nEsta carta es un borrador revisable. No reemplaza asesoría legal.",
    "sernac": "Asunto: Reclamo por cláusula abusiva...\n\n[reclamo ~240 palabras]\n\nEsta carta es un borrador revisable. No reemplaza asesoría legal."
  },
  "sources": [
    { "name": "Ley 19.628 - Art. 4", "type": "legal", "url": "https://..." },
    { "name": "Ley 21.521 - Art. 23 (NCG 514)", "type": "legal", "url": "https://..." },
    { "name": "Ley 21.719 - Art. 35", "type": "legal", "url": "https://..." },
    { "name": "Ley 18.010 - Art. 6 bis (TMC)", "type": "legal", "url": "https://..." },
    { "name": "CMF RPSF (mock)", "type": "mock" }
  ],
  "agentRuns": [
    { "agent": "intake",         "model": "claude-haiku-4-5",  "durationMs": 850,  "status": "done" },
    { "agent": "regulatory",     "model": "pinecone-rag",      "durationMs": 420,  "status": "done" },
    { "agent": "risk",           "model": "claude-sonnet-4-6", "durationMs": 5200, "status": "done" },
    { "agent": "recommendation", "model": "claude-sonnet-4-6", "durationMs": 6100, "status": "done" },
    { "agent": "validator",      "model": "claude-haiku-4-5",  "durationMs": 950,  "status": "done" }
  ],
  "meta": {
    "processedAt": "2026-05-06T18:32:11Z",
    "zeroStorage": true,
    "piiRedacted": false,
    "mocked": false
  }
}
```

---

## 12. Fallback Strategy

| Fallo | Fallback |
|---|---|
| Pinecone índice vacío / down | `legal.fixtures.ts` con 8 chunks hardcoded |
| **PhishTank API down/timeout** | retornar `{ error, _fallback: true }`; tool no rompe flujo, agente continúa sin esa señal |
| **BCN API Ley Fácil down** | mismo patrón; agente sigue con chunks Pinecone |
| **Banco Central BDE no registrado/down** | TMC=27% hardcoded con `source: 'fallback'` |
| Claude 1 agente falla 2x | ese agente devuelve fixture parcial, status `warn`; el flujo continúa |
| Claude ≥2 agentes fallan | response = fixture demo del escenario, `meta.mocked=true` |
| Mongo down | seguir respondiendo, no persistir, log warning |
| Frontend no llega al backend | `NEXT_PUBLIC_USE_MOCK=true` o auto-fallback en `api.ts` |
| Demo en vivo, todo falla | frontend con mockApi independiente muestra escenario completo |

**Triple defensa:**
1. Backend con fixtures internos (4 escenarios completos en `analysis.fixtures.ts`)
2. Frontend con mockApi (4 fixtures)
3. UI estática (`demo-primera-idea.html`) como último recurso narrativo
