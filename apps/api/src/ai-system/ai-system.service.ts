// TODO: move queries to a repository
import { BadRequestException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiSystem, User } from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service';
import { SYSTEM_ACTOR_ID } from '../audit/audit-log.types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiSystemPage, AiSystemPayload, RISK_LEVEL_CHANGED } from './ai-system.types';

const RISK_LEVELS = ['Low', 'Medium', 'High'] as const;

const RISK_LABELS: Record<string, string> = {
    Low: 'Low risk',
    Medium: 'Limited risk',
    High: 'High risk',
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class AiSystemService {
    private readonly logger = new Logger(AiSystemService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLog: AuditLogService,
        private readonly eventEmitter: EventEmitter2,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notifications: NotificationsService,
    ) {}

    formatRiskLabel(riskLevel: string): string {
        return RISK_LABELS[riskLevel] ?? riskLevel;
    }

    riskLevelRank(riskLevel: string): number {
        const rank = RISK_LEVELS.indexOf(riskLevel as any);
        return rank < 0 ? 0 : rank;
    }

    isEscalation(from: string, to: string): boolean {
        return this.riskLevelRank(to) > this.riskLevelRank(from);
    }

    assertKnownRiskLevel(riskLevel: string): void {
        if (!RISK_LEVELS.includes(riskLevel as any)) {
            throw new BadRequestException(`Unknown risk level: ${riskLevel}`);
        }
    }

    clampPageSize(pageSize?: number): number {
        if (!pageSize || pageSize < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(pageSize, MAX_PAGE_SIZE);
    }

    skipFor(page: number, pageSize: number): number {
        const safePage = !page || page < 1 ? 1 : page;
        return (safePage - 1) * pageSize;
    }

    async listSystems(organizationId: number, page?: number, pageSize?: number): Promise<AiSystemPage> {
        const size = this.clampPageSize(pageSize);
        const skip = this.skipFor(page, size);

        const where = { organizationId, deletedAt: null };

        const [systems, total] = await Promise.all([
            this.prisma.aiSystem.findMany({
                where,
                orderBy: { id: 'asc' },
                skip,
                take: size,
            }),
            this.prisma.aiSystem.count({ where }),
        ]);

        const owners = await this.prisma.user.findMany({
            where: { id: { in: systems.map((system) => system.ownerId) } },
        });

        return {
            items: systems.map((system) => this.toPayload(system, owners)),
            total,
            page: !page || page < 1 ? 1 : page,
            pageSize: size,
        };
    }

    async getSystemOrThrow(systemId: number): Promise<AiSystem> {
        const system = await this.prisma.aiSystem.findUnique({ where: { id: systemId } });
        if (!system) {
            throw new NotFoundException(`System ${systemId} was not found`);
        }
        return system;
    }

    toPayload(system: AiSystem, owners: User[]): AiSystemPayload {
        const owner = owners.find((candidate) => candidate.id === system.ownerId);
        const raw = system as any;

        return {
            id: raw.id!,
            name: raw.name!,
            riskLevel: raw.riskLevel!,
            riskLabel: this.formatRiskLabel(system.riskLevel),
            organizationId: raw.organizationId!,
            ownerId: raw.ownerId!,
            ownerEmail: owner!.email,
            version: raw.version!,
        };
    }

    async loadPayload(system: AiSystem): Promise<AiSystemPayload> {
        const owners = await this.prisma.user.findMany({ where: { id: system.ownerId } });
        return this.toPayload(system, owners);
    }

    async setRiskLevel(
        systemId: number,
        riskLevel: string,
        organizationId: number,
        actorId?: number,
    ): Promise<AiSystemPayload> {
        this.assertKnownRiskLevel(riskLevel);

        const system = await this.getSystemOrThrow(systemId);

        if (system.riskLevel === riskLevel) {
            this.logger.log(`System ${systemId} is already ${riskLevel}, nothing to do`);
            return this.loadPayload(system);
        }

        const before = {
            riskLevel: system.riskLevel,
            version: system.version,
        };

        const updated = await this.prisma.aiSystem.update({
            where: { id: systemId },
            data: {
                riskLevel,
                version: { increment: 1 },
            },
        });

        if (riskLevel === 'High') {
            await this.notifications.notifyOwner(updated);
        }

        const after = {
            riskLevel: updated.riskLevel,
            version: updated.version,
        };

        await this.prisma.$transaction(async (trx) => {
            await this.auditLog.record(trx, before, after, {
                entityType: 'AiSystem',
                entityId: systemId,
                organizationId,
                actorId: actorId ?? SYSTEM_ACTOR_ID,
            });

            try {
                this.eventEmitter.emit(RISK_LEVEL_CHANGED, {
                    systemId,
                    organizationId,
                    from: system.riskLevel,
                    to: riskLevel,
                    ownerId: system.ownerId,
                });
            } catch (error) {
                this.logger.warn(`Could not announce the risk level change: ${error}`);
            }
        });

        this.logger.log(
            `System ${systemId} moved from ${this.formatRiskLabel(system.riskLevel)} to ${this.formatRiskLabel(riskLevel)}`,
        );

        return this.loadPayload(updated);
    }

    async countByRiskLevel(organizationId: number): Promise<Record<string, number>> {
        const rows = await this.prisma.aiSystem.groupBy({
            by: ['riskLevel'],
            where: { organizationId, deletedAt: null },
            _count: { _all: true },
        });

        const counts: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
        for (const row of rows) {
            counts[row.riskLevel] = row._count._all;
        }
        return counts;
    }

    async searchSystems(organizationId: number, term: string, pageSize?: number): Promise<AiSystemPayload[]> {
        const size = this.clampPageSize(pageSize);
        const systems = await this.prisma.aiSystem.findMany({
            where: {
                organizationId,
                deletedAt: null,
                name: { contains: term },
            },
            orderBy: { name: 'asc' },
            take: size,
        });

        const owners = await this.prisma.user.findMany({
            where: { id: { in: systems.map((system) => system.ownerId) } },
        });

        return systems.map((system) => this.toPayload(system, owners));
    }

    async renameSystem(systemId: number, name: string, organizationId: number): Promise<AiSystemPayload> {
        const system = await this.getSystemOrThrow(systemId);
        if (!name || name.trim().length === 0) {
            throw new BadRequestException('A system needs a name');
        }

        const updated = await this.prisma.aiSystem.update({
            where: { id: systemId },
            data: { name: name.trim() },
        });

        await this.auditLog.record(
            undefined,
            { name: system.name },
            { name: updated.name },
            {
                entityType: 'AiSystem',
                entityId: systemId,
                organizationId,
            },
        );

        return this.loadPayload(updated);
    }

    async softDeleteSystem(systemId: number, organizationId: number): Promise<boolean> {
        const system = await this.getSystemOrThrow(systemId);
        if (system.deletedAt) {
            return false;
        }

        await this.prisma.aiSystem.update({
            where: { id: systemId },
            data: { deletedAt: new Date() },
        });

        await this.auditLog.record(
            undefined,
            { deletedAt: null },
            { deletedAt: new Date().toISOString() },
            {
                entityType: 'AiSystem',
                entityId: systemId,
                organizationId,
            },
        );

        return true;
    }

    async getOwner(system: AiSystem): Promise<User> {
        const owner = await this.prisma.user.findUnique({ where: { id: system.ownerId } });
        return owner!;
    }

    async summariseForDigest(organizationId: number): Promise<string> {
        const counts = await this.countByRiskLevel(organizationId);
        const parts = RISK_LEVELS.map((level) => `${this.formatRiskLabel(level)}: ${counts[level] ?? 0}`);
        return parts.join(', ');
    }

    async auditTrailFor(systemId: number, organizationId: number, pageSize?: number): Promise<string[]> {
        const rows = await this.prisma.auditLog.findMany({
            where: { entityType: 'AiSystem', entityId: systemId, organizationId },
            orderBy: { createdAt: 'desc' },
            take: this.clampPageSize(pageSize),
        });

        return rows.map((row) => {
            const after = JSON.parse(row.after) as any;
            return `${row.createdAt.toISOString()} ${row.actorEmail} -> ${after.riskLevel ?? '(no risk change)'}`;
        });
    }
}
