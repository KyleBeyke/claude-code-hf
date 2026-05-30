import { existsSync, lstatSync, mkdirSync, renameSync, symlinkSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function linkWithBackup(source, target) {
  mkdirSync(dirname(target), { recursive: true });

  if (!existsSync(source)) {
    throw new Error(`Missing source: ${source}`);
  }

  let targetStat;
  try {
    targetStat = lstatSync(target);
  } catch {
    targetStat = undefined;
  }

  if (targetStat) {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink()) {
      unlinkSync(target);
    } else {
      const backup = `${target}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      renameSync(target, backup);
      console.log(`Backed up existing file to ${backup}`);
    }
  }

  symlinkSync(source, target);
  console.log(`Linked ${target} -> ${source}`);
}

function tryLinkWithBackup(source, target) {
  try {
    linkWithBackup(source, target);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Skipped ${target}: ${message}`);
    return false;
  }
}

linkWithBackup(
  join(root, '.claude', 'settings.json'),
  join(process.env.HOME, '.claude', 'settings.json')
);

linkWithBackup(
  join(root, '.claude', 'CLAUDE.md'),
  join(process.env.HOME, '.claude', 'CLAUDE.md')
);

const launcherSource = join(root, 'bin', 'claude-hf');
const binCandidates = [
  '/opt/homebrew/bin/claude-hf', // macOS Homebrew (Apple Silicon)
  '/usr/local/bin/claude-hf', // Linux/macOS fallback
  join(process.env.HOME, '.local', 'bin', 'claude-hf') // user-writable fallback
];

let linkedLauncher = false;
for (const candidate of binCandidates) {
  if (tryLinkWithBackup(launcherSource, candidate)) {
    linkedLauncher = true;
    break;
  }
}

if (!linkedLauncher) {
  throw new Error('Failed to link claude-hf launcher into PATH candidates.');
}
