import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AgentRunDocument = HydratedDocument<AgentRun>;

@Schema({ timestamps: true, collection: 'agent_runs' })
export class AgentRun {
  @Prop({ index: true })
  analysisId: string;

  @Prop({ required: true })
  agent: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  status: 'done' | 'warn';

  @Prop({ type: Number, default: 0 })
  durationMs: number;

  @Prop({ type: Object, default: {} })
  inputSummary: Record<string, unknown>;

  @Prop({ type: Object, default: {} })
  outputSummary: Record<string, unknown>;

  @Prop({ type: Object, default: {} })
  tokenUsage: Record<string, unknown>;
}

export const AgentRunSchema = SchemaFactory.createForClass(AgentRun);
AgentRunSchema.index({ createdAt: -1 });
