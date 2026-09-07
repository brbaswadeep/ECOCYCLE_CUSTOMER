# AGENTS.md

Instructions for AI coding agents (Claude Code, or any other agent) working in this repository, and in the companion `ecocycle-admin` project. Read `docs/designConvention.md` and `docs/databaseStructure.md` before making any UI or data change; they document the existing design system and Firestore schema in detail. These rules apply on top of that context, not instead of it.

## Hard rules

- No emojis anywhere, ever. Not in source code, not in code comments, not in commit messages, not in any markdown documentation, not in any UI copy, label, or component. This applies to every file in both repositories.
- No unnecessary code comments. A comment should only explain a non-obvious "why" (a hidden constraint, a workaround, a subtle invariant), never restate what the code already says. Default to writing no comment at all.
- Do not create report, summary, or changelog markdown files in the codebase (for example `SUMMARY.md`, `CHANGES.md`, `NOTES.md`, `REPORT.md`). Findings, summaries, and progress notes belong in the conversation or the PR description, not in committed files. Only write to `docs/` when documenting something durable and asked for.
- Avoid unnecessary blinking or pulsing "live" status dots (`animate-pulse`, `animate-ping` small circle indicators). Only use them where something is genuinely real-time and the indicator communicates real information, never as decoration on a card, badge, or nav item just to look lively.
- Avoid unnecessary pill-shaped tags and badges (`rounded-full` label chips). Reserve fully-rounded shapes for things that are actually round by nature (avatars, small count badges, icon containers). Default to a plain label or a rectangular tag (`rounded-lg` / `rounded-xl`) instead of wrapping every piece of metadata in a pill.
- No solid, fully-saturated color borders (for example `border-2 border-red-500`, `border-blue-600`, `border-green-500`). Follow the existing convention of subtle, low-opacity or neutral borders (`border-brand-brown/10`, `border-gray-100`, and similar, documented in `docs/designConvention.md`). Bold solid-color borders read as unpolished, generated ("vibe coded") UI rather than deliberately designed UI.

## Where to look first

- `docs/designConvention.md` - visual design system: brand colors, layout shell, component patterns, typography, spacing/radius/shadow scales.
- `docs/databaseStructure.md` - Firestore collections, exact field names, status enums, and relationships.
