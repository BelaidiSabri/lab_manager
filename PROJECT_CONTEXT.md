# Lab Manager — Project context

## Stack

- **Monorepo**: `client/` (React 19 + Vite + Tailwind 4) + `server/` (Express 5 + Mongoose + MongoDB)
- **Auth**: JWT, roles in `server/constants/roles.ts` (hierarchy: `super_admin` → `master_student`)

## Domain modules

| Module | Model(s) | API prefix | UI routes |
|--------|----------|------------|-----------|
| Auth / users | `User`, `Profile` | `/api/auth`, `/api/users` | `/profil`, `/membres` |
| Équipes | `ResearchTeam`, `TeamCollaboration` | `/api/teams` | `/equipes` |
| Publications | `Publication` | `/api/publications` | `/publications` |
| **Projets** | `Project` | `/api/projects` | `/projets` |
| Documents | `Document` | `/api/documents` | `/documents` |
| Concours | `Concours`, `ConcoursCandidature` | `/api/concours` | `/concours` |
| Encadrement | `Supervision`, `EncadrementRequest` | `/api/supervisions`, `/api/encadrement-requests` | `/encadreurs`, `/mes-demandes` |

## Project model (`server/models/Project.ts`)

| Field | Type | Notes |
|-------|------|--------|
| `title` | string | required |
| `description` | string | |
| `type` | string | free text (ANR, CIFRE, etc.) |
| `status` | enum | `planned`, `active`, `suspended`, `completed` |
| `leader` | User ref | Maître-assistant+ |
| `members` | User[] | leader always included |
| `teams` | ResearchTeam[] | optional; one or more équipes |
| `team` | ResearchTeam ref | **deprecated** (legacy rows); use `teams` |
| `startDate`, `endDate` | Date | optional |
| `fundingSource` | string | free text |
| `relatedPublications` | Publication[] | |
| `createdBy` | User ref | |

### Status workflow

- **Forward only**: `planned` → `active` → `completed` | `suspended`; `suspended` → `completed`
- **`completed`**: fully locked (no edits, members, or publication links)
- New projects start as **`planned`**

### Équipes sur un projet

- Un projet peut être rattaché à **une ou plusieurs** équipes (`teams[]`).
- **Projet inter-équipes** (2+ équipes) : chaque paire doit avoir une **collaboration** active (`TeamCollaboration`, `endDate` non dépassée).
- À la création, si aucune équipe n’est envoyée, l’équipe du chef de projet est proposée par défaut.
- Filtre liste : `GET /api/projects?team=<id>` — projets où l’équipe figure dans `teams` (ou legacy `team`).
- Validation : `server/utils/projectTeams.ts` (`validateProjectTeamIds`, `parseTeamIdsFromBody`).
- **Lien collaboration ↔ projet** : `collaboration` sur `Project`, `projects[]` sur `TeamCollaboration` ; API `POST/DELETE .../collaborations/:partnerId/projects`.
- **Rattachement** : `POST/DELETE /api/projects/:id/teams/:teamId` (comme membres / publications).
- **Modèle logique** : `leader` + `members[]` = personnes ; `teams[]` = équipes ; `collaboration` = projet inter-équipes explicite.

### Permissions

| Action | Who |
|--------|-----|
| Create | `maitre_assistant` and above |
| Edit / members / publications | **Leader** or `super_admin` only (not regular members) |
| Delete | `super_admin` only, status must be `planned` |
| List / view | All authenticated users |

## Key files

- `server/utils/projectStatus.ts` — transitions, `canCreateOrLeadProject`
- `server/controllers/projectController.ts` — CRUD + members + publication links
- `server/routes/projectRoutes.ts`
- `client/src/constants/projects.ts` — status labels (FR)
- `client/src/pages/ProjectsPage.tsx`, `ProjectDetailPage.tsx`, `ProjectNewPage.tsx`
- `client/src/components/projects/ProjectTeamPicker.tsx` — sélection multi-équipes (collaborations)

## Cross-links

- `GET /api/users/:id` returns `projectsLed`, `projectsJoined`
- `GET /api/projects?team=` filters by équipe (membre de `teams` ou legacy `team`)
- Collaborations inter-équipes → projets communs via `teams[]` sur `Project`
- Dashboard: `mine.projects`, `mine.projectsLed`, `mine.projectsActive`, `global.projectsActive`
