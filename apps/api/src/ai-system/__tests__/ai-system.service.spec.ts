import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { AuditLogService } from '../../audit/audit-log.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSystemService } from '../ai-system.service';

describe('AiSystemService', () => {
    const system = {
        id: 1,
        name: 'Acme Credit Scoring',
        riskLevel: 'Medium',
        organizationId: 1,
        ownerId: 1,
        deletedAt: null,
        version: 1,
    };

    const prisma = {
        aiSystem: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        user: {
            findMany: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    const auditLog = { record: jest.fn() };
    const notifications = { notifyOwner: jest.fn() };

    let service: AiSystemService;

    beforeEach(async () => {
        jest.clearAllMocks();

        prisma.aiSystem.findUnique.mockResolvedValue(system);
        prisma.aiSystem.update.mockResolvedValue({ ...system, riskLevel: 'High', version: 2 });
        prisma.user.findMany.mockResolvedValue([{ id: 1, email: 'alice@acme.test' }]);
        prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

        const moduleRef = await Test.createTestingModule({
            providers: [
                AiSystemService,
                { provide: PrismaService, useValue: prisma },
                { provide: AuditLogService, useValue: auditLog },
                { provide: NotificationsService, useValue: notifications },
                { provide: EventEmitter2, useValue: new EventEmitter2() },
            ],
        }).compile();

        service = moduleRef.get(AiSystemService);
    });

    it('formats the risk label', () => {
        expect(service.formatRiskLabel('High')).toBe('High risk');
    });

    it('updates the system once', async () => {
        await service.setRiskLevel(1, 'High', 1, 1);

        expect(prisma.aiSystem.update).toHaveBeenCalledTimes(1);
        expect(prisma.aiSystem.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { riskLevel: 'High', version: { increment: 1 } },
        });
    });

    it('writes an audit row', async () => {
        await service.setRiskLevel(1, 'High', 1, 1);

        expect(auditLog.record).toHaveBeenCalledTimes(1);
    });
});
