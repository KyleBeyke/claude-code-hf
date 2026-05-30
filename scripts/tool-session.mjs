#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const settingsPath = join(root, '.claude', 'settings.json');
const installedPath = join(process.env.HOME, '.claude', 'plugins', 'installed_plugins.json');
const launcher = join(root, 'bin', 'claude-hf');

const baseline = {
  'typescript-lsp@claude-plugins-official': true,
  'playwright@claude-plugins-official': true,
  'security-guidance@claude-plugins-official': true,
  'api-contract-forge@claude-community': true,
  'backend-security-skills@claude-community': true,
  'sonatype-guide@claude-plugins-official': true
};

const profiles = {
  lean: {
    description: 'Default low-noise development profile.',
    plugins: baseline
  },
  frontend: {
    description: 'Frontend/UI implementation and browser verification.',
    plugins: {
      ...baseline,
      'frontend-design@claude-plugins-official': true,
      'playground@claude-plugins-official': true
    }
  },
  review: {
    description: 'Code review, PR review, risk finding, and simplification.',
    plugins: {
      ...baseline,
      'code-review@claude-plugins-official': true,
      'pr-review-toolkit@claude-plugins-official': true,
      'code-simplifier@claude-plugins-official': true
    }
  },
  docs: {
    description: 'Documentation, library context, and repo onboarding.',
    plugins: {
      ...baseline,
      'context7@claude-plugins-official': true,
      'claude-md-management@claude-plugins-official': true
    }
  },
  python: {
    description: 'Python work with Pyright.',
    plugins: {
      ...baseline,
      'pyright-lsp@claude-plugins-official': true
    }
  },
  polyglot: {
    description: 'Temporary multi-language LSP profile.',
    plugins: {
      ...baseline,
      'pyright-lsp@claude-plugins-official': true,
      'clangd-lsp@claude-plugins-official': true,
      'gopls-lsp@claude-plugins-official': true,
      'rust-analyzer-lsp@claude-plugins-official': true,
      'lua-lsp@claude-plugins-official': true,
      'php-lsp@claude-plugins-official': true,
      'swift-lsp@claude-plugins-official': true
    }
  },
  github: {
    description: 'GitHub MCP profile. Requires GitHub/Copilot MCP auth; otherwise it may show a failed MCP server.',
    plugins: {
      ...baseline,
      'github@claude-plugins-official': true
    }
  },
  minimal: {
    description: 'No plugins beyond Claude built-ins.',
    plugins: {}
  }
};

const knownPlugins = Object.keys(
  Object.values(profiles).reduce((acc, profile) => ({ ...acc, ...profile.plugins }), {})
);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function usage() {
  console.log(`Usage:
  npm run claude:tools -- profiles
  npm run claude:tools -- list
  npm run claude:tools -- recommend "task text"
  npm run claude:tools -- apply <profile>
  npm run claude:tools -- reset
  npm run claude:with -- <profile|auto> [claude-hf args or prompt]

Profiles: ${Object.keys(profiles).join(', ')}
`);
}

function pluginName(fullId) {
  return fullId.split('@')[0];
}

function readInstalled() {
  if (!existsSync(installedPath)) return new Set();
  const data = readJson(installedPath);
  return new Set(Object.keys(data.plugins ?? {}));
}

function ensureInstalled(pluginIds) {
  const installed = readInstalled();

  for (const id of pluginIds) {
    if (installed.has(id)) continue;

    const result = spawnSync('claude', ['plugin', 'install', '-s', 'user', id], {
      stdio: 'inherit'
    });
    if (result.status !== 0) {
      throw new Error(`Failed to install plugin ${id}`);
    }
  }
}

function normalizeEnabled(pluginMap) {
  const normalized = {};
  for (const id of knownPlugins) normalized[id] = false;
  for (const [id, enabled] of Object.entries(pluginMap)) normalized[id] = Boolean(enabled);
  return normalized;
}

function writeProfile(profileName) {
  const profile = profiles[profileName];
  if (!profile) throw new Error(`Unknown profile: ${profileName}`);

  ensureInstalled(Object.keys(profile.plugins));

  const settings = readJson(settingsPath);
  settings.enabledPlugins = {
    ...(settings.enabledPlugins ?? {}),
    ...normalizeEnabled(profile.plugins)
  };
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

function resetBaseline() {
  writeProfile('lean');
}

function recommend(taskText) {
  const text = taskText.toLowerCase();

  if (/\b(frontend|ui|css|html|react|vue|svelte|browser|playwright|screenshot|page|visual)\b/.test(text)) {
    return 'frontend';
  }
  if (/\b(review|audit|appraise|pr|pull request|diff|risk|regression|security review)\b/.test(text)) {
    return 'review';
  }
  if (/\b(docs?|documentation|readme|library docs?|api docs?|context7)\b/.test(text)) {
    return 'docs';
  }
  if (/\b(python|pyright|pytest|django|fastapi)\b/.test(text)) {
    return 'python';
  }
  if (/\b(rust|cargo|go |golang|php|lua|swift|clang|c\\+\\+|cpp)\b/.test(text)) {
    return 'polyglot';
  }
  if (/\b(github|issue|pull request|pr|actions|workflow|ci)\b/.test(text)) {
    return 'lean';
  }
  if (/\b(simple|quick|explain|summarize|status|what is|what's)\b/.test(text)) {
    return 'minimal';
  }
  return 'lean';
}

function showProfiles() {
  for (const [name, profile] of Object.entries(profiles)) {
    const enabled = Object.entries(profile.plugins)
      .filter(([, value]) => value)
      .map(([id]) => pluginName(id))
      .join(', ') || 'none';
    console.log(`${name}: ${profile.description}`);
    console.log(`  enables: ${enabled}`);
  }
}

function listInstalled() {
  const installed = readInstalled();
  for (const id of [...installed].sort()) {
    console.log(id);
  }
}

function runWithProfile(profileName, args) {
  const selected = profileName === 'auto' ? recommend(args.join(' ')) : profileName;
  if (!profiles[selected]) throw new Error(`Unknown profile: ${selected}`);

  // Snapshot current settings so temporary profile changes are always reversible.
  const original = readFileSync(settingsPath, 'utf8');
  let child;
  let restored = false;

  function restore() {
    if (restored) return;
    writeFileSync(settingsPath, original);
    restored = true;
    console.error(`claude-hf tools: restored baseline after ${selected} session`);
  }

  process.on('SIGINT', () => {
    restore();
    if (child && !child.killed) child.kill('SIGINT');
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    restore();
    if (child && !child.killed) child.kill('SIGTERM');
    process.exit(143);
  });

  writeProfile(selected);
  console.error(`claude-hf tools: profile=${selected} (${profiles[selected].description})`);

  child = spawn(launcher, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env
  });

  child.on('exit', (code, signal) => {
    restore();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'profiles':
        showProfiles();
        break;
      case 'list':
        listInstalled();
        break;
      case 'recommend':
        // Deterministic recommendation keeps routing/token overhead at zero.
        console.log(recommend(args.join(' ')));
        break;
      case 'apply':
        writeProfile(args[0] ?? 'lean');
        console.log(`applied profile=${args[0] ?? 'lean'}`);
        break;
      case 'reset':
        resetBaseline();
        console.log('applied profile=lean');
        break;
      case 'run':
        runWithProfile(args[0] ?? 'auto', args.slice(1));
        break;
      default:
        usage();
        process.exitCode = command ? 1 : 0;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
