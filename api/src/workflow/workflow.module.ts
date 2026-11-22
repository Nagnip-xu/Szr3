import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { DuixModule } from '../integrations/duix/duix.module';
import { DeepSeekLlmService } from '../integrations/shuaiapi/deepseek-llm.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [MediaModule, DuixModule, ComplianceModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, DeepSeekLlmService],
})
export class WorkflowModule {}
