export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    indexName: process.env.PINECONE_INDEX_NAME || 'feriapro-rag',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/feriapro',
  },
});
