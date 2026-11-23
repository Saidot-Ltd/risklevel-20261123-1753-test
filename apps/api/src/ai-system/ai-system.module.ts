import { forwardRef, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiSystemController } from './ai-system.controller';
import { AiSystemResolver } from './ai-system.resolver';
import { AiSystemService } from './ai-system.service';
import { RiskLevelChangedListener } from './listeners/risk-level-changed.listener';

@Module({
    imports: [AuditModule, forwardRef(() => NotificationsModule)],
    controllers: [AiSystemController],
    providers: [AiSystemService, AiSystemResolver, RiskLevelChangedListener],
    exports: [AiSystemService],
})
export class AiSystemModule {}
