# Lab Manager

Application de gestion de laboratoire (membres, publications, projets, concours, équipes de recherche, etc.).

## Run locally

1. Install dependencies:

```bash
npm run install-all
```

2. Create server env file:

- Copy `server/.env.example` to `server/.env`
- Fill required values:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `SUPER_ADMIN_PASSWORD`

3. Start backend + frontend:

```bash
npm run dev
```

## Open the app

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)

## Équipes de recherche

Les **équipes** (`ResearchTeam`) regroupent les membres du labo autour d’un axe de recherche, d’un leader et d’une description. Chaque utilisateur actif (hors super administrateur) peut appartenir à **une seule** équipe via `User.teamId`.

- **UI** : menu **Équipes** → `/equipes` (liste) et `/equipes/:id` (détail).
- **Création d’équipe** : **Maître-assistant** et supérieurs.
- **Gestion d’une équipe** (membres, nouvelle collaboration) : **leader de l’équipe** ou **Maître-assistant**+ / `super_admin`.
- **Fiche équipe — membres** : recherche (nom, e-mail, rôle), filtres par rôle et grade ; bouton **Retirer** pour les gestionnaires.

## Collaborations inter-équipes

Deux équipes distinctes peuvent établir une **collaboration** réciproque : le lien est unique (pas de doublon A↔B) et visible depuis la fiche de chaque équipe partenaire.

| Aspect | Détail |
|--------|--------|
| **Modèle** | `TeamCollaboration` — paire `(teamA, teamB)` normalisée, `note`, `startDate` / `endDate` optionnelles, `createdBy` |
| **Symétrie** | Une collaboration entre Équipe X et Équipe Y apparaît sur les deux fiches |
| **Période** | Dates de début et fin optionnelles à la création ou via modification |
| **Fin / modification** | **Leaders des deux équipes** (ou Maître-assistant+ / super_admin) |
| **Notification** | Le leader de l’équipe partenaire reçoit `team_collaboration_added` |
| **Suppression d’équipe** | Toutes les collaborations liées sont supprimées automatiquement |

### API (`/api/teams`)

| Méthode | Route | Qui peut agir | Description |
|---------|-------|---------------|-------------|
| `GET` | `/:id/collaborations` | Authentifié | Liste des équipes partenaires |
| `POST` | `/:id/collaborations` | Leader de `:id` ou Maître-assistant+ | Corps : `{ partnerTeamId, note?, startDate?, endDate? }` |
| `PUT` | `/:id/collaborations/:partnerId` | Leader de l’une ou l’autre équipe, ou Maître-assistant+ | Met à jour note et période |
| `DELETE` | `/:id/collaborations/:partnerId` | Leader de l’une ou l’autre équipe, ou Maître-assistant+ | Termine la collaboration |
| `POST` | `/:id/members` | Leader de `:id` ou Maître-assistant+ | Ajoute un membre |
| `DELETE` | `/:id/members/:userId` | Leader de `:id` ou Maître-assistant+ | Retire un membre |

La liste des équipes (`GET /api/teams`) inclut aussi `collaborationCount` par équipe.

### Audit

Actions journalisées : `TEAM_COLLABORATION_ADDED`, `TEAM_COLLABORATION_UPDATED`, `TEAM_COLLABORATION_REMOVED`.
