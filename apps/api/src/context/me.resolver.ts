import { Query, Resolver } from '@nestjs/graphql';
import { Me } from './me.graphql.types';
import { SessionContext } from './session-context.service';

@Resolver(() => Me)
export class MeResolver {
    constructor(private readonly sessionContext: SessionContext) {}

    @Query(() => Me)
    me(): Me {
        return {
            id: this.sessionContext.userId,
            email: this.sessionContext.userEmail,
            organizationId: this.sessionContext.organizationId,
        };
    }
}
