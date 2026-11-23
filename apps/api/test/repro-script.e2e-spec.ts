import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const apiRoot = join(__dirname, '..');

describe('pnpm repro (e2e)', () => {
    let output: string;
    let exitCode: number;

    beforeAll(() => {
        try {
            output = execFileSync('pnpm', ['repro'], {
                cwd: apiRoot,
                env: { ...process.env, DATABASE_URL: 'file:./test.db' },
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            exitCode = 0;
        } catch (error) {
            output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
            exitCode = error.status;
        }
    });

    it('exits cleanly', () => {
        expect(exitCode).toBe(0);
    });

    it('runs both scenarios over REST', () => {
        expect(output).toContain('scenario 1: alice@acme.test (organisation 1) sets system 1 to High');
        expect(output).toContain('scenario 2: bob@globex.test (organisation 2) sets system 1 to High');
        expect(output.match(/PATCH \/systems\/1\/risk-level/g)).toHaveLength(2);
        expect(output.match(/response status \d{3}/g)).toHaveLength(2);
    });

    it('prints the three tables it promises', () => {
        expect(output).toContain('AiSystem');
        expect(output).toContain('AuditLog (entity AiSystem 1)');
        expect(output).toContain('Notification (system 1)');
    });
});
