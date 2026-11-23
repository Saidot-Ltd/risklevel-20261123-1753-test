import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const rootPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const pnpmVersion = rootPackage.packageManager.split('@')[1];
const minNodeMajor = Number(rootPackage.engines.node.replace(/\D/g, ''));

function fail(message) {
    console.error(`\n${message}\n`);
    process.exit(1);
}

function installedPnpmVersion() {
    const result = spawnSync('pnpm', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
    return result.status === 0 ? result.stdout.trim() : null;
}

function run(command, args) {
    console.log(`\n> ${[command, ...args].join(' ')}`);
    const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.status !== 0) {
        fail(`Setup stopped: "${[command, ...args].join(' ')}" failed. Fix the error above and run this again.`);
    }
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < minNodeMajor) {
    fail(
        `Node ${process.versions.node} is too old. This project needs Node ${minNodeMajor} or newer.\n` +
            `Install it from https://nodejs.org or with your version manager (nvm, fnm, mise), then run this again.`,
    );
}

const hasPnpm = installedPnpmVersion() === pnpmVersion;
const [command, ...prefix] = hasPnpm ? ['pnpm'] : ['npx', '--yes', `pnpm@${pnpmVersion}`];
const runner = hasPnpm ? 'pnpm' : `npx pnpm@${pnpmVersion}`;
if (!hasPnpm) {
    console.log(`pnpm ${pnpmVersion} is not installed, so setup runs it through npx. Nothing is installed globally.`);
}

run(command, [...prefix, 'install']);
run(command, [...prefix, 'db:reset']);
run(command, [...prefix, 'typecheck']);

console.log(`
Setup is complete. Next:

  ${runner} dev      # terminal A: web on http://localhost:4373, API on http://localhost:4300
  ${runner} repro    # terminal B: run the reproduction
`);
