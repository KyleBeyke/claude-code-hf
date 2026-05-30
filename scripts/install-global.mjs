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

linkWithBackup(
  join(root, '.claude', 'settings.json'),
  join(process.env.HOME, '.claude', 'settings.json')
);

linkWithBackup(
  join(root, '.claude', 'CLAUDE.md'),
  join(process.env.HOME, '.claude', 'CLAUDE.md')
);

const binTarget = '/opt/homebrew/bin/claude-hf';
if (existsSync(dirname(binTarget))) {
  linkWithBackup(join(root, 'bin', 'claude-hf'), binTarget);
}
