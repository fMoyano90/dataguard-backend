import { Pinecone } from '@pinecone-database/pinecone';
import { LEGAL_ARTICLE_CHUNKS } from '../src/data-sources/fixtures/legal-articles.fixtures';

const EMBEDDING_MODEL = 'multilingual-e5-large';
const NAMESPACE = 'legal-chile';

async function preloadLegal() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const indexName = process.env.PINECONE_INDEX_NAME || 'feriapro-rag';
  const index = pinecone.index(indexName).namespace(NAMESPACE);

  console.log(`Preloading ${LEGAL_ARTICLE_CHUNKS.length} legal chunks into Pinecone namespace "${NAMESPACE}"...`);

  const vectors = LEGAL_ARTICLE_CHUNKS.map((chunk) => {
    const id = `legal-${chunk.ley.replace(/[^a-z0-9]/gi, '').toLowerCase()}-${chunk.articulo.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
    return {
      id,
      values: [] as number[],
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
  });

  const batchSize = 50;
  let ingested = 0;

  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);

    const embeddings = await Promise.all(
      batch.map(async (vector) => {
        const response = await pinecone.inference.embed(
          EMBEDDING_MODEL,
          [vector.metadata.text as string],
          { inputType: 'passage', truncate: 'END' },
        );
        return {
          ...vector,
          values: (response.data[0] as any).values as number[],
        };
      }),
    );

    await index.upsert(embeddings);
    ingested += embeddings.length;
    console.log(`  Ingested ${ingested}/${vectors.length} chunks`);
  }

  console.log(`Done. ${ingested} chunks in namespace "${NAMESPACE}".`);
}

preloadLegal().catch((error) => {
  console.error('Preload failed:', error);
  process.exit(1);
});
