import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransaction } from '../../prisma/prisma.types';
import { AuditLogService } from '../audit-log.service';
import { SYSTEM_ACTOR_EMAIL, SYSTEM_ACTOR_ID } from '../audit-log.types';

const META = { entityType: 'AiSystem', entityId: 1, organizationId: 1 };

function buildClient() {
    return {
        auditLog: { create: jest.fn().mockResolvedValue({}) },
        user: { findUnique: jest.fn().mockResolvedValue({ id: 1, email: 'alice@acme.test' }) },
    };
}

describe('AuditLogService.record', () => {
    let prisma: ReturnType<typeof buildClient>;
    let service: AuditLogService;

    beforeEach(() => {
        prisma = buildClient();
        service = new AuditLogService(prisma as unknown as PrismaService);
    });

    it('writes nothing when no field changed value', async () => {
        await service.record(undefined, { riskLevel: 'High', version: 2 }, { riskLevel: 'High', version: 2 }, META);

        expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('writes nothing when the after state carries no fields', async () => {
        await service.record(undefined, { riskLevel: 'High' }, {}, META);

        expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('names the system actor when no actor was given', async () => {
        await service.record(undefined, { riskLevel: 'Medium' }, { riskLevel: 'High' }, META);

        expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
            actorId: SYSTEM_ACTOR_ID,
            actorEmail: SYSTEM_ACTOR_EMAIL,
        });
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('writes through the transaction client it was given, not its own', async () => {
        const trx = buildClient();

        await service.record(trx as unknown as PrismaTransaction, { riskLevel: 'Medium' }, { riskLevel: 'High' }, META);

        expect(trx.auditLog.create).toHaveBeenCalledTimes(1);
        expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
});
