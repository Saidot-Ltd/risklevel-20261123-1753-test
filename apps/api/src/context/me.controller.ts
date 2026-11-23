import { Controller, Get } from '@nestjs/common';
import { Me } from './me.graphql.types';
import { SessionContext } from './session-context.service';

@Controller('me')
export class MeController {
    constructor(private readonly sessionContext: SessionContext) {}

    @Get()
    me(): Me {
        return {
            id: this.sessionContext.userId,
            email: this.sessionContext.userEmail,
            organizationId: this.sessionContext.organizationId,
        };
    }
}
