# Managed Project Entry

This project is managed by SDD Harness V7_2.

## Active checkout (2026-11-09 migration)

The user designated this copied folder as the authoritative checkout for future development, commits, and GitHub pushes:

```text
C:/Users/Administrator/Documents/ChatGPT/禾迈Hoymiles_AI销售助手/Hoymiles_SalesAssistant
```

Remote repository: `git@github.com:Carlvic0101/Hoymiles_Assistant.git`. On this computer, the repository-local `core.sshCommand` uses GitHub's SSH endpoint on port 443, the existing `github.com` host-key alias, and strict host-key verification; do not disable verification.

Use this repository for product commits. `nextlevelbuilder/ui-ux-pro-max-skill` is the upstream UI/UX skill repository, not a destination for this application's code. Keep unfinished backend work out of frontend-only commits; stage an explicit file list, not the whole working tree.

The original E: drive project and the sibling `Hoymiles_Assistant` folder are not the active checkout. Do not develop or push from those copies. Preserve the migrated uncommitted work. Local `.env` stays ignored and must not be committed.

The project was copied without the surrounding Harness. The old `../../harness-core/` relative path no longer resolves here. Until the Harness is migrated separately, read its existing core rules from:

```text
E:/1_ZyEduCodingClass/appendix/Dev_Hepler/SDD_Carlvic/harness-core/
```

Use that location only as the SDD rule source; keep project changes and Git operations in this active checkout.

Project files live here:

```text
.sdd/
docs/
frontend/
backend/
```

Do not create local `.cursor/`, `.claude/`, or `.codex/` rule copies inside this project unless the Harness explicitly asks for it.
