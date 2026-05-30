# Global Claude Code Development Defaults

Use Hugging Face Inference Providers for every model request. Do not route work
to Anthropic, OpenRouter, Gemini, Codex, or other non-HF inference services
unless Kyle explicitly changes this policy.

Optimize for the same operating style Kyle uses with API-backed Codex
`gpt-5.3-codex` high:

- Treat implementation requests as focused engineering slices.
- Make direct, scoped edits once enough local context is known.
- Prefer `rg`/`rg --files` for search and read the minimum files needed.
- Do not spawn Explore agents, subagents, background agents, or agent teams
  unless Kyle explicitly asks in the current prompt.
- Do not use broad plugin workflows by default. Prefer local files, shell,
  TypeScript diagnostics, tests, and the repo's own scripts.
- Preserve user changes. Never reset, checkout, or delete unrelated work.
- For behavior changes, use a tight loop: inspect, edit, typecheck/test,
  repair, summarize.
- Run the most targeted useful verification first; run broader checks when the
  change touches shared behavior or contracts.
- Before finalizing, review the diff for accidental churn, secrets, generated
  output, and missing tests.

Model roles:

- Main coding executor: `sonnet` -> `Qwen/Qwen3-Coder-480B-A35B-Instruct:together`.
- Planner / hard reasoning: `opus` -> `moonshotai/Kimi-K2.6:together`.
- Cheap fast/background: `haiku` -> `Qwen/Qwen3.6-35B-A3B:deepinfra`.
- Backup generalist: `Qwen/Qwen3.5-397B-A17B:deepinfra`.

Automatic routing:

- The `claude-hf` launcher uses local deterministic routing by default. It does
  not spend model tokens to classify tasks.
- Use the cheapest adequate route: `fast` for simple read-only questions,
  `code` for implementation, `plan` for hard planning/root cause/architecture,
  `review` for risk finding, and `backup` only for provider issues or explicit
  fallback requests.
- Explicit launcher modes always override automatic routing.

Automatic tool profiles:

- Use `npm run claude:tools -- profiles` to discover local tool profiles.
- Use `npm run claude:tools -- list` to list installed Claude plugins.
- Use `npm run claude:with -- auto "<task>"` to temporarily apply a deterministic
  plugin profile, launch Claude, and restore the previous settings when done.
- Do not leave broad tool profiles enabled globally. Restore to `lean` after
  exploratory or specialized work.

Safety:

- Never read or print `.env`, `.env.*`, auth/session state, wallets, private
  keys, API tokens, or runtime artifacts unless Kyle explicitly asks.
- Do not run destructive live systems unless Kyle explicitly confirms the
  exact target and action.
- If a model/provider starts returning malformed, empty, socket-closed, or
  budget-exhausted responses, stop the session and restart with a smaller prompt
  instead of resuming a large failed context.
