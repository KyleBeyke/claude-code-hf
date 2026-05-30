# Claude Code HF Development Rig

This repo is the source of truth for Kyle's Claude Code deployment through Hugging Face Inference Providers, without using Anthropic models.

## Run

```sh
claude
```

Plain `claude` picks up the global Hugging Face settings from `~/.claude/settings.json`, which should be linked to this repo's `.claude/settings.json`. The explicit launcher is also available:

```sh
claude-hf
./bin/claude-hf
```

Pass Claude Code flags normally:

```sh
claude --model opus
claude --model sonnet
claude --model haiku
```

Convenience launcher modes:

```sh
./bin/claude-hf           # automatic route selection
./bin/claude-hf auto      # automatic route selection, explicit
./bin/claude-hf route "prompt" # show selected route without spending tokens
./bin/claude-hf codex-high # explicit Codex-high style: sonnet, high effort
./bin/claude-hf code      # main coding executor: sonnet, high effort
./bin/claude-hf plan      # planner: opus, high effort, plan mode
./bin/claude-hf review    # hard-reasoning review: opus, high effort
./bin/claude-hf fast      # cheap fast: haiku, low effort
./bin/claude-hf backup    # backup generalist, high effort
```

## Model Slots

Claude Code's internal model slots are mapped to Hugging Face Inference Provider routes:

- Planner / hard reasoning, `opus`: `moonshotai/Kimi-K2.6:together`
- Main coding executor, `sonnet`: `Qwen/Qwen3-Coder-480B-A35B-Instruct:together`
- Cheap fast/background, `haiku`: `Qwen/Qwen3.6-35B-A3B:deepinfra`
- Backup generalist, custom option: `Qwen/Qwen3.5-397B-A17B:deepinfra`
- Subagent slot: `Qwen/Qwen3.6-35B-A3B:deepinfra`

You can override any slot for a single run:

```sh
ANTHROPIC_DEFAULT_SONNET_MODEL="Qwen/Qwen3.5-397B-A17B:deepinfra" ./bin/claude-hf code
```

## Development Plugins

The config keeps plugin load intentionally small so Claude behaves more like the current Codex workflow:

- `typescript-lsp`
- `playwright`
- `security-guidance`
- `api-contract-forge`
- `backend-security-skills`
- `sonatype-guide`

GitHub MCP is disabled by default because the official Claude plugin attempts
to connect to `api.githubcopilot.com/mcp/` and reports a failed MCP server when
Copilot MCP auth is unavailable. Use local `git`/`gh` commands or Codex's GitHub
integration for repository work unless you intentionally configure that MCP.

Agent-heavy, broad workflow, multi-language LSP, session-report, Semgrep, GitHub
MCP, and context-expansion plugins are disabled by default.

## Codex-High Parity Mode

`./bin/claude-hf code` and `./bin/claude-hf codex-high` are the closest practical
equivalents of Kyle's Codex `gpt-5.3-codex` high workflow:

- `sonnet` model slot -> `Qwen/Qwen3-Coder-480B-A35B-Instruct:together`
- `--effort high`
- a short appended system prompt that enforces focused slices, scoped edits,
  local verification, no agents/subagents/background work, and concise handoff
- global instructions in `~/.claude/CLAUDE.md` linked from this repo

This improves reliability and discipline, but it does not make HF-backed Claude
Code identical to OpenAI's Codex model/runtime. Use Codex for the highest-stakes
repair loops when available; use this rig when you need HF-backed overflow.

## Automatic Routing

`./bin/claude-hf` defaults to local deterministic routing. The router does not
call a model, so it avoids spending tokens to decide which model should spend
tokens.

Routing rules:

- review / audit / appraise / risk prompts -> `review`: Kimi, high effort
- plan-only / architecture / root-cause prompts -> `plan`: Kimi, high effort,
  plan permission mode when the prompt is clearly non-editing
- implement / fix / repair / refactor / test prompts -> `code`: Qwen Coder
  480B, high effort
- simple explanation / status / summary prompts -> `fast`: Qwen 35B, low effort
- provider-failure or explicit backup wording -> `backup`: Qwen 397B, high effort

Preview the route without an API call:

```sh
claude-hf route "What is this error?"
claude-hf route "Plan only. Do not edit files. Design the next step."
claude-hf route "Implement the focused fix and run tests."
claude-hf route "Review this diff for bugs."
```

Show routing decisions when launching real sessions:

```sh
CLAUDE_HF_SHOW_ROUTE=1 claude-hf "Implement the focused fix and run tests."
```

## Automatic Tool Profiles

Claude Code has plugin discovery and lifecycle commands:

```sh
claude plugin marketplace list
claude plugin list
claude plugin details <plugin>
claude plugin install <plugin@marketplace>
claude plugin enable <plugin>
claude plugin disable <plugin>
claude plugin prune
```

This repo adds a safer wrapper that avoids leaving plugin-heavy sessions enabled
after the work is done:

```sh
npm run claude:tools -- profiles
npm run claude:tools -- list
npm run claude:tools -- recommend "Review this diff for regressions"
npm run claude:with -- auto "Review this diff for regressions"
npm run claude:with -- frontend "Fix this React layout and verify in browser"
npm run claude:tools -- reset
```

`claude:with` temporarily applies the selected plugin profile, launches
`claude-hf`, then restores your previous settings when Claude exits. The
profile selector is local and deterministic, so no tokens are spent deciding
which tools to use.

Available profiles:

- `minimal`: no plugins beyond Claude built-ins
- `lean`: default TypeScript/API/security/browser helper set
- `frontend`: adds frontend-design and playground
- `review`: adds code-review, PR-review-toolkit, and code-simplifier
- `docs`: adds context7 and Claude markdown management
- `python`: adds pyright
- `polyglot`: adds extra language servers
- `github`: enables GitHub MCP, but only use it after configuring GitHub/Copilot
  MCP auth; otherwise it may report a failed MCP server

## Secret Handling

The Hugging Face token is stored in the macOS Keychain under service `claude-hf-token`. Global Claude Code settings use `apiKeyHelper` to retrieve it at runtime. The launcher also respects an existing `HF_TOKEN` environment variable.

The setup deliberately avoids plugins that call non-HF model providers such as OpenRouter, Gemini, Codex, or proprietary AI review services.

## Git Hygiene

This repository is intended to be safe to publish publicly.

- Keep all credentials in macOS Keychain or environment variables, never in tracked files.
- `.gitignore` excludes common secret-bearing files and local Claude runtime state.
- Global machine files under `~/.claude/` are symlinked at install time and are not part of this repo.

Quick secret preflight before pushing:

```sh
git status --short
rg -n "hf_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{10,}|AKIA[0-9A-Z]{16}" .
```

## Install / Verify

```sh
npm run install:global
npm run claude:status
npm run claude:route:check
npm run claude:tools -- profiles
npm run claude:check
```
