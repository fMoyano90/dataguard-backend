import { Module } from '@nestjs/common';
import { DataSourcesModule } from '../data-sources/data-sources.module';
import { PiiModule } from '../pii/pii.module';
import { RagModule } from '../rag/rag.module';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  imports: [DataSourcesModule, PiiModule, RagModule],
  providers: [ToolRegistryService],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
