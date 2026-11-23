import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { seedDatabase } from '../prisma/seed';
import { AppModule } from './app.module';
import { NOTIFICATION_PROVIDER, NotificationProvider } from './notifications/notification-provider.types';

const LOOPBACK_HOST = '127.0.0.1';
const SYSTEM_ID = 1;
const RISK_LEVEL = 'High';
const ACME = { organizationId: 1, userId: 1, email: 'alice@acme.test' };
const GLOBEX = { organizationId: 2, userId: 2, email: 'bob@globex.test' };

interface Scenario {
    title: string;
    userEmail: string;
    body: Record<string, unknown>;
    providerDown: boolean;
}

const SCENARIOS: Scenario[] = [
    {
        title: `scenario 1: ${ACME.email} (organisation ${ACME.organizationId}) sets system ${SYSTEM_ID} to ${RISK_LEVEL}; the notification provider is down`,
        userEmail: ACME.email,
        body: { riskLevel: RISK_LEVEL, organizationId: ACME.organizationId, actorId: ACME.userId },
        providerDown: true,
    },
    {
        title: `scenario 2: ${GLOBEX.email} (organisation ${GLOBEX.organizationId}) sets system ${SYSTEM_ID} to ${RISK_LEVEL}, sending organizationId ${ACME.organizationId}`,
        userEmail: GLOBEX.email,
        body: { riskLevel: RISK_LEVEL, organizationId: ACME.organizationId, actorId: GLOBEX.userId },
        providerDown: false,
    },
];

class SwitchableProvider implements NotificationProvider {
    down = false;

    async send(message: string): Promise<void> {
        if (this.down) {
            throw new Error(`notification provider is down (message: "${message}")`);
        }
    }
}

async function bootApp(provider: SwitchableProvider): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(NOTIFICATION_PROVIDER)
        .useValue(provider)
        .compile();

    const app = moduleRef.createNestApplication();
    await app.listen(0, LOOPBACK_HOST);
    return app;
}

async function printRecords(prisma: PrismaClient): Promise<void> {
    const systems = await prisma.aiSystem.findMany({
        where: { id: SYSTEM_ID },
        select: { id: true, name: true, riskLevel: true, organizationId: true, version: true },
    });
    const auditRows = await prisma.auditLog.findMany({
        where: { entityType: 'AiSystem', entityId: SYSTEM_ID },
        select: { id: true, entityId: true, actorId: true, actorEmail: true, before: true, after: true },
    });
    const notifications = await prisma.notification.findMany({
        where: { systemId: SYSTEM_ID },
        select: { id: true, systemId: true, recipientId: true, message: true },
    });

    console.log('AiSystem');
    console.table(systems);
    console.log(`AuditLog (entity AiSystem ${SYSTEM_ID})`);
    console.table(auditRows);
    console.log(`Notification (system ${SYSTEM_ID})`);
    console.table(notifications);
}

async function runScenario(
    app: INestApplication,
    prisma: PrismaClient,
    provider: SwitchableProvider,
    scenario: Scenario,
) {
    await seedDatabase(prisma);
    provider.down = scenario.providerDown;

    const before = await prisma.aiSystem.findUnique({ where: { id: SYSTEM_ID } });

    console.log(scenario.title);
    console.log(`PATCH /systems/${SYSTEM_ID}/risk-level ${JSON.stringify(scenario.body)}`);
    const response = await request(app.getHttpServer())
        .patch(`/systems/${SYSTEM_ID}/risk-level`)
        .set('x-user-email', scenario.userEmail)
        .send(scenario.body);

    console.log(`response status ${response.status}${response.body?.message ? `: ${response.body.message}` : ''}`);
    console.log(`system ${SYSTEM_ID} before: riskLevel ${before.riskLevel}, version ${before.version}`);
    console.log('');
    await printRecords(prisma);
    console.log('');
}

async function main(): Promise<void> {
    Logger.overrideLogger(['error', 'warn']);

    execSync('pnpm exec prisma migrate deploy', { cwd: join(__dirname, '..'), stdio: 'ignore' });

    const prisma = new PrismaClient();
    const provider = new SwitchableProvider();
    const app = await bootApp(provider);

    for (const scenario of SCENARIOS) {
        await runScenario(app, prisma, provider, scenario);
    }

    await prisma.$disconnect();
    await app.close();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
