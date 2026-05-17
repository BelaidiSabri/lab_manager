# Features and tasks

## Implementation status

| Feature | Status | Notes |
|---------|--------|--------|
| Auth & roles | Done | JWT, first-login password change |
| Membres / annuaire | Done | Directory, detail, admin |
| Équipes | Done | CRUD, members, inter-team collaborations |
| Collaborations inter-équipes | Done | Dates, both leaders can end/edit; projets multi-équipes |
| Publications + visibilité | Done | 6 visibility levels, author control |
| **Projets de recherche** | **Done** | Full CRUD, status flow, members, pub links |
| Documents | Partial | Role-based visibility |
| Concours | Done | Candidatures, promotions |
| Encadrement | Done | Requests, supervisions |
| Dashboard | Done | Stats incl. projects |
| AI module | Planned | See `server/index.ts` TODO |

## Projets de recherche — completed (current)

- [x] Model: title, description, type, status, leader, members, team, dates, funding, publications, createdBy
- [x] Status: planned → active → completed | suspended; completed locked
- [x] API: CRUD, `POST/DELETE .../members`, `POST/DELETE .../publications`
- [x] UI: `/projets`, `/projets/nouveau`, `/projets/:id`
- [x] Surfaces: member detail, team detail, dashboard stats
- [x] Docs: PROJECT_CONTEXT.md, FEATURES_AND_TASKS.md, cursor-context.md
- [x] Projets multi-équipes : `teams[]`, validation collaborations, `ProjectTeamPicker`
- [x] Projets sur collaborations : lier/créer depuis fiche équipe ; équipes sur fiche projet (rattacher/retirer)

## Suggested next tasks

1. **Projects**: email notifications on status change or member add
2. **Projects**: export PDF / report per project
3. **Publications**: link from project picker with search only visible pubs (already enforced on link)
4. **Documents**: align upload flow with projects
5. Migrate legacy `Project` rows with `paused`/`archived` status to `suspended`/`completed` if any exist in DB

## Current task

_None — projets feature complete as of last update._
