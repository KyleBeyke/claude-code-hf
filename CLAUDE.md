# Claude Code HF Rig

This repository is the source of truth for Kyle's Claude Code setup that uses
Hugging Face Inference Providers only.

When changing this setup:

- Keep tokens out of files. The HF token belongs in macOS Keychain under service `claude-hf-token`.
- Preserve HF routing in both `bin/claude-hf` and `.claude/settings.json`.
- Keep `~/.claude/settings.json` linked to this repo's `.claude/settings.json`.
- Optimize for the same style of work used in Codex `gpt-5.3-codex` high: small scoped implementation slices, high-effort direct edits, local tests, repair loops, and concise handoff.
- Do not enable subagents, Explore agents, background agents, or broad agent teams by default.
- Keep plugin load small. Enable only stack-relevant development plugins.
- Avoid plugins or scripts that perform model inference through Anthropic, OpenRouter, Gemini, Codex, or proprietary review services.
- Verify with a real non-interactive `claude` or `claude-hf` call after changes.
- Keep `./bin/claude-hf` defaulting to the main coding executor with `--effort high`.
- Keep automatic routing deterministic and local. Do not add an LLM classifier
  for routing; it wastes tokens before useful work begins.

Model roles:

- `opus`: `moonshotai/Kimi-K2.6:together` for planning, hard debugging, architecture, and final review.
- `sonnet`: `Qwen/Qwen3-Coder-480B-A35B-Instruct:together` as the main coding executor.
- `haiku`: `Qwen/Qwen3.6-35B-A3B:deepinfra` for cheap fast/background work.
- backup: `Qwen/Qwen3.5-397B-A17B:deepinfra` when the main coding route is slow or unavailable.
