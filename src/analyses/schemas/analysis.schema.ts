import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnalysisDocument = HydratedDocument<Analysis>;

@Schema({ timestamps: true, collection: 'analyses' })
export class Analysis {
  @Prop()
  scenario: string;

  @Prop()
  language: string;

  @Prop()
  entity: string;

  @Prop()
  documentType: string;

  @Prop()
  textRedacted: string;

  @Prop({ type: Number })
  riskScore: number;

  @Prop()
  riskLabel: string;

  @Prop()
  resultTitle: string;

  @Prop()
  resultText: string;

  @Prop({ type: Object, default: { good: [], bad: [], red: [] } })
  pillars: { good: unknown[]; bad: unknown[]; red: unknown[] };

  @Prop({ type: [String], default: [] })
  plan: string[];

  @Prop({ type: Object, default: {} })
  letters: { bank?: string; sernac?: string };

  @Prop({ type: Array, default: [] })
  sources: unknown[];

  @Prop({ type: Object, default: {} })
  meta: Record<string, unknown>;
}

export const AnalysisSchema = SchemaFactory.createForClass(Analysis);
AnalysisSchema.index({ createdAt: -1 });
