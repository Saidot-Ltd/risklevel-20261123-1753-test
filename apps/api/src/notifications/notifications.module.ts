import { forwardRef, Module } from '@nestjs/common';
import { AiSystemModule } from '../ai-system/ai-system.module';
import { LoggingNotificationProvider } from './logging-notification.provider';
import { NOTIFICATION_PROVIDER } from './notification-provider.types';
import { NotificationsService } from './notifications.service';

@Module({
    imports: [forwardRef(() => AiSystemModule)],
    providers: [NotificationsService, { provide: NOTIFICATION_PROVIDER, useClass: LoggingNotificationProvider }],
    exports: [NotificationsService, NOTIFICATION_PROVIDER],
})
export class NotificationsModule {}
