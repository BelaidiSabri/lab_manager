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

Les collaborations permettent aussi de rattacher un **projet de recherche** aux équipes partenaires (voir section Projets).

## Publications — visibilité

Chaque publication du catalogue peut restreindre qui la consulte. Les **co-auteurs** et le **super administrateur** y ont toujours accès.

| Visibilité | Public concerné |
|------------|-----------------|
| `lab` | Tout le laboratoire (défaut) |
| `team` | Membres de l’équipe de l’auteur (via `teamId` / équipe du créateur) |
| `team_and_collaborators` | Équipe + équipes en collaboration inter-équipes |
| `senior_staff` | Maître-assistant et grades supérieurs |
| `authors` | Co-auteurs uniquement (brouillon interne) |
| `custom_roles` | Rôles du labo choisis à la création (comme les documents) |

- **Création / édition** : formulaire avec choix de visibilité, co-auteurs et lien fichier.
- **Liste / recherche** : filtrées côté serveur selon le viewer (`publicationAccess.ts`).
- **Détail** : `/publications/:id` — modification réservée aux co-auteurs ou super admin.

## Projets de recherche

Catalogue des projets du labo avec statut, **une ou plusieurs équipes**, membres et publications liées.

Les équipes en **collaboration inter-équipes** peuvent co-porter un même projet : sélectionnez plusieurs équipes à la création (chaque paire doit avoir une collaboration active enregistrée).

| Statut | Signification |
|--------|----------------|
| Planifié | Création initiale |
| En cours | Projet actif |
| Suspendu | En pause (peut aller vers terminé) |
| Terminé | Verrouillé |

- **Création** : Maître-assistant et supérieurs → `/projets/nouveau`
- **Modification** : chef de projet ou super administrateur
- **API** : `/api/projects` (+ `/members`, `/publications` sur un projet)

Voir `PROJECT_CONTEXT.md` et `FEATURES_AND_TASKS.md` pour le détail technique.
