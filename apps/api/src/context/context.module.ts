import { Global, Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeResolver } from './me.resolver';
import { SessionContext } from './session-context.service';

@Global()
@Module({
    controllers: [MeController],
    providers: [SessionContext, MeResolver],
    exports: [SessionContext],
})
export class ContextModule {}
