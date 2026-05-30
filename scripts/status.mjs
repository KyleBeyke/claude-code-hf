import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const settingsPath = join(process.env.HOME, '.claude', 'settings.json');
const globalInstructionsPath = join(process.env.HOME, '.claude', 'CLAUDE.md');
const expected = join(process.cwd(), '.claude', 'settings.json');
const expectedInstructions = join(process.cwd(), '.claude', 'CLAUDE.md');

console.log(`settings: ${settingsPath}`);
if (!existsSync(settingsPath)) {
  console.log('settings_status: missing');
  process.exitCode = 1;
} else {
  const stat = lstatSync(settingsPath);
  console.log(`settings_status: ${stat.isSymbolicLink() ? 'symlink' : 'regular-file'}`);
  console.log(`settings_target: ${realpathSync(settingsPath)}`);
}

const settings = JSON.parse(readFileSync(expected, 'utf8'));
console.log(`default_model: ${settings.model}`);
console.log(`opus: ${settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL}`);
console.log(`sonnet: ${settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL}`);
console.log(`haiku: ${settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL}`);
console.log(`backup: ${settings.env.ANTHROPIC_CUSTOM_MODEL_OPTION}`);
console.log(`gateway_discovery: ${settings.env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY}`);

console.log(`global_instructions: ${globalInstructionsPath}`);
if (!existsSync(globalInstructionsPath)) {
  console.log('global_instructions_status: missing');
  process.exitCode = 1;
} else {
  const stat = lstatSync(globalInstructionsPath);
  console.log(`global_instructions_status: ${stat.isSymbolicLink() ? 'symlink' : 'regular-file'}`);
  console.log(`global_instructions_target: ${realpathSync(globalInstructionsPath)}`);
  if (realpathSync(globalInstructionsPath) !== realpathSync(expectedInstructions)) {
    process.exitCode = 1;
  }
}

const whichLauncher = spawnSync('sh', ['-lc', 'command -v claude-hf || true'], {
  encoding: 'utf8'
}).stdout.trim();
console.log(`launcher_in_path: ${whichLauncher || 'missing'}`);
