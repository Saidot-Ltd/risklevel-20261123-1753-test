import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { SessionContext } from '../context/session-context.service';
import {
    PageSchema,
    PageSizeSchema,
    SetRiskLevelBody,
    SetRiskLevelBodySchema,
    SystemIdSchema,
} from './ai-system.schemas';
import { AiSystemService } from './ai-system.service';
import { AiSystemPage, AiSystemPayload } from './ai-system.types';

@Controller('systems')
export class AiSystemController {
    constructor(
        private readonly aiSystemService: AiSystemService,
        private readonly sessionContext: SessionContext,
    ) {}

    @Get()
    async aiSystems(
        @Query('page', new ZodValidationPipe(PageSchema)) page?: number,
        @Query('pageSize', new ZodValidationPipe(PageSizeSchema)) pageSize?: number,
    ): Promise<AiSystemPage> {
        return this.aiSystemService.listSystems(this.sessionContext.organizationId, page, pageSize);
    }

    @Patch(':systemId/risk-level')
    async setSystemRiskLevel(
        @Param('systemId', new ZodValidationPipe(SystemIdSchema)) systemId: number,
        @Body(new ZodValidationPipe(SetRiskLevelBodySchema)) body: SetRiskLevelBody,
    ): Promise<AiSystemPayload> {
        return this.aiSystemService.setRiskLevel(systemId, body.riskLevel, body.organizationId, body.actorId);
    }
}
