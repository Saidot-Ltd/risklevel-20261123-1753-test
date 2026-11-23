import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ZodValidationPipe } from 'nestjs-zod';
import { SessionContext } from '../context/session-context.service';
import {
    ActorIdSchema,
    OrganizationIdSchema,
    PageSchema,
    PageSizeSchema,
    RiskLevelSchema,
    SystemIdSchema,
} from './ai-system.schemas';
import { AiSystemService } from './ai-system.service';
import { AiSystemPage, AiSystemPayload } from './ai-system.types';

@Resolver(() => AiSystemPayload)
export class AiSystemResolver {
    constructor(
        private readonly aiSystemService: AiSystemService,
        private readonly sessionContext: SessionContext,
    ) {}

    @Query(() => AiSystemPage)
    async aiSystems(
        @Args('page', { type: () => Int, nullable: true }, new ZodValidationPipe(PageSchema)) page?: number,
        @Args('pageSize', { type: () => Int, nullable: true }, new ZodValidationPipe(PageSizeSchema)) pageSize?: number,
    ): Promise<AiSystemPage> {
        return this.aiSystemService.listSystems(this.sessionContext.organizationId, page, pageSize);
    }

    @Mutation(() => AiSystemPayload)
    async setSystemRiskLevel(
        @Args('systemId', { type: () => Int }, new ZodValidationPipe(SystemIdSchema)) systemId: number,
        @Args('riskLevel', new ZodValidationPipe(RiskLevelSchema)) riskLevel: string,
        @Args('organizationId', { type: () => Int }, new ZodValidationPipe(OrganizationIdSchema))
        organizationId: number,
        @Args('actorId', { type: () => Int, nullable: true }, new ZodValidationPipe(ActorIdSchema)) actorId?: number,
    ): Promise<AiSystemPayload> {
        return this.aiSystemService.setRiskLevel(systemId, riskLevel, organizationId, actorId);
    }
}
