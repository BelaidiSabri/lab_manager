# Cursor agent context — lab-manager

Quick orientation for AI agents working in this repo.

## Run

```bash
npm run install-all
# server/.env from server/.env.example
npm run dev
```

## Conventions

- **Language**: UI copy in French; code identifiers in English
- **Design system**: `ds-card`, `ds-title-page`, `ds-card-title`, `inputClass` from `client/src/constants/formStyles.ts`
- **API client**: `client/src/services/labApi.ts`
- **Roles**: `canManageTeams` / `canCreateProjects` = Maître-assistant+; check `server/constants/roles.ts`
- **Audit**: `writeAuditLog` on mutating controllers; routes use `auditLogger` middleware
- **Do not** commit unless user asks

## When editing projects

- Read `PROJECT_CONTEXT.md` for model and permissions
- Leader-only edit (not members) — see `canEditProject` in `projectController.ts`
- Status transitions in `server/utils/projectStatus.ts` — never allow backwards from `completed`
- Leader auto-added to `members` via `ensureLeaderInMembers`
- **Multi-team**: `teams[]` on `Project`; 2+ teams require active `TeamCollaboration` per pair (`projectTeams.ts`)
- UI: `ProjectTeamPicker` on create/edit; body `{ teams: [id, ...] }` or legacy `{ team: id }`

## When editing publications

- Visibility filtering: `server/utils/publicationAccess.ts`
- Authors always see their publications

## When editing équipes

- Team access: `server/utils/teamAccess.ts`
- Collaborations: `TeamCollaboration` model, both leaders can manage

## Docs to update after feature work

1. `PROJECT_CONTEXT.md` — model/routes
2. `FEATURES_AND_TASKS.md` — status checkboxes
3. `README.md` — user-facing summary (optional)
