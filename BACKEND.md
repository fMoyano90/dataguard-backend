# FeriaPro — Backend RAG

Backend NestJS mínimo con pipeline RAG funcional. Conecta Claude API, Pinecone y MongoDB Atlas.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | NestJS 10 + TypeScript |
| IA — generación | Claude Sonnet 4.6 (`@anthropic-ai/sdk`) |
| IA — embeddings | Pinecone Inference (`multilingual-e5-large`) |
| Base de datos vectorial | Pinecone serverless (AWS us-east-1) |
| Base de datos documental | MongoDB Atlas (`mongoose`) |
| Validación | `class-validator` + `class-transformer` |

---

## Estructura de archivos

```
backend/
├── src/
│   ├── main.ts                    # Bootstrap: puerto 3001, prefijo /api, CORS, ValidationPipe
│   ├── app.module.ts              # Raíz: ConfigModule + MongooseModule + RagModule
│   ├── config/
│   │   └── configuration.ts      # Mapeo de variables de entorno tipadas
│   └── rag/
│       ├── rag.module.ts
│       ├── rag.controller.ts      # POST /api/rag/ingest, POST /api/rag/query
│       ├── rag.service.ts         # Lógica de embeddings, Pinecone y Claude
│       └── dto/
│           ├── ingest.dto.ts      # Validación del body de ingest
│           └── query.dto.ts       # Validación del body de query
├── .env                           # Variables reales (gitignored)
├── .env.example                   # Plantilla para nuevos devs
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Variables de entorno

```env
ANTHROPIC_API_KEY=sk-ant-...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=feriapro-rag
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/?appName=Cluster0
PORT=3001
```

---

## Comandos

```bash
npm run start:dev   # Hot reload (desarrollo)
npm run build       # Compilar a dist/
npm run start       # Producción desde dist/
```

---

## API

### `POST /api/rag/ingest`

Convierte texto en embedding y lo guarda en Pinecone con metadata.

**Body:**

```json
{
  "text": "La Ley 21.719 establece los derechos ARCO...",
  "source": "Ley 21.719",
  "metadata": {
    "categoria": "arco",
    "ley": "21719"
  }
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `text` | string | sí | Texto a indexar |
| `source` | string | no | Etiqueta de origen (default: `"manual"`) |
| `metadata` | object | no | Claves adicionales libres (strings) |

**Respuesta 201:**

```json
{
  "id": "59083324-bce5-4900-a16f-4cc6454ba70d",
  "status": "ingested"
}
```

---

### `POST /api/rag/query`

Busca los chunks más relevantes en Pinecone y genera una respuesta con Claude Sonnet 4.6.

**Body:**

```json
{
  "query": "¿Cuántos días tiene una empresa para responder una solicitud ARCO?",
  "topK": 5
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `query` | string | sí | Pregunta en lenguaje natural |
| `topK` | number | no | Cantidad de chunks a recuperar (1–20, default: 5) |

**Respuesta 200:**

```json
{
  "answer": "De acuerdo con la Ley 21.719, las empresas tienen **30 días**...",
  "usage": {
    "inputTokens": 209,
    "outputTokens": 320,
    "cacheReadTokens": 0
  },
  "sources": [
    {
      "id": "59083324-bce5-4900-a16f-4cc6454ba70d",
      "score": 0.907,
      "source": "Ley 21.719",
      "excerpt": "La Ley 21.719 establece los derechos ARCO..."
    }
  ]
}
```

---

## Cómo funciona el pipeline RAG

```
INGEST
  texto → Pinecone Inference (multilingual-e5-large)
        → vector 1024 dims
        → upsert en Pinecone con {text, source, metadata}

QUERY
  pregunta → Pinecone Inference (query mode)
           → vector 1024 dims
           → similarity search en Pinecone (cosine, top-k)
           → chunks recuperados como contexto
           → Claude Sonnet 4.6 genera respuesta citando fuentes
           → devuelve {answer, usage, sources}
```

### Modelo de embeddings

`multilingual-e5-large` — 1024 dimensiones, soporte nativo para español. Elegido sobre modelos en inglés porque el corpus regulatorio chileno está en español.

### Prompt caching

El system prompt de Claude se marca con `cache_control: { type: 'ephemeral' }`. En llamadas repetidas dentro de la misma ventana de 5 minutos, el prefijo del system se reutiliza y reduce el costo de tokens de entrada hasta un 90%.

### Auto-creación del índice

Al iniciar, `RagService.onModuleInit()` verifica si el índice `PINECONE_INDEX_NAME` existe. Si no, lo crea como serverless en AWS us-east-1 con métrica cosine y espera 10 segundos antes de continuar.

---

## MongoDB — estado actual

La conexión está establecida y disponible a través de `MongooseModule`. Aún no hay schemas definidos. Para agregar una colección:

```typescript
// src/ejemplo/schemas/documento.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Documento {
  @Prop({ required: true })
  contenido: string;

  @Prop()
  fuente: string;
}

export const DocumentoSchema = SchemaFactory.createForClass(Documento);
export type DocumentoDocument = Documento & Document;
```

```typescript
// src/ejemplo/ejemplo.module.ts — importar el schema
MongooseModule.forFeature([{ name: Documento.name, schema: DocumentoSchema }])
```

---

## Próximos pasos sugeridos

- [ ] Agregar chunking automático para documentos largos (dividir en chunks de ~500 tokens antes de ingestar)
- [ ] Endpoint `POST /api/rag/ingest/pdf` — recibir PDF, parsear con Files API de Claude y chunking automático
- [ ] Schema MongoDB para auditar cada query (qué se preguntó, qué respondió, tokens consumidos)
- [ ] Namespaces en Pinecone por agente (DataGuard, FeriasLibres, Soberano.ai) para aislar el contexto de cada producto
- [ ] Autenticación JWT en los endpoints antes de exponer a frontend
