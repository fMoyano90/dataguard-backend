import { Module } from '@nestjs/common';
import { PiiValidationService } from './pii-validation.service';

@Module({
  providers: [PiiValidationService],
  exports: [PiiValidationService],
})
export class PiiModule {}
