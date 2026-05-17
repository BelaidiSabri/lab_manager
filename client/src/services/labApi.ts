import { api } from '../api/client';

export type DashboardStats = {
  role: string;
  totals?: {
    users: number;
    publications: number;
    projects: number;
    documents: number;
    openConcours: number;
  };
  mine: {
    publications: number;
    projects: number;
    supervisionsSupervisor: number;
    supervisionsStudent: number;
  };
  global: {
    publications: number;
    projects: number;
    documents: number;
    openConcours: number;
  };
};

export const fetchDashboardStats = () => api.get<DashboardStats>('/dashboard/stats').then((r) => r.data);

export const fetchMembersDirectory = (params?: { role?: string; isActive?: boolean; team?: string }) =>
  api
    .get<{
      members: {
        id: string;
        name: string;
        email: string;
        role: string;
        currentGrade?: string;
        department?: string;
        speciality?: string;
        isActive: boolean;
        team?: { id: string; name: string } | null;
        hasActiveSupervision?: boolean;
      }[];
    }>('/members', { params })
    .then((r) => r.data.members);

export const fetchUserDetail = (id: string, includeSupervisions?: boolean) =>
  api
    .get<{
      user: Record<string, unknown>;
      profile: unknown;
      supervisions?: { asSupervisor: unknown[]; asSupervised: unknown[] };
      gradeHistory?: unknown[];
      candidatures?: unknown[];
      activeSupervisions?: { asSupervisor: unknown[]; asSupervised: unknown[] };
    }>(`/users/${id}`, { params: includeSupervisions ? { include: 'supervisions' } : {} })
    .then((r) => r.data);

export const promoteUser = (
  id: string,
  body: { reason: 'graduation' | 'thesis_defense'; date: string }
) => api.post(`/users/${id}/promote`, body);

export const fetchConcoursList = () => api.get<{ concours: unknown[] }>('/concours').then((r) => r.data.concours);

export const fetchMyConcoursCandidatures = () =>
  api.get<{ candidatures: unknown[] }>('/concours/my/candidatures').then((r) => r.data.candidatures);

export type UserEligibility = {
  canApply: boolean;
  code: string;
  message: string;
};

export const fetchConcoursById = (id: string) =>
  api
    .get<{ concours: Record<string, unknown>; userEligibility: UserEligibility | null }>(`/concours/${id}`)
    .then((r) => r.data);

export const updateConcours = (id: string, body: Record<string, unknown>) =>
  api.put<{ concours: Record<string, unknown> }>(`/concours/${id}`, body).then((r) => r.data.concours);

export const applyConcours = (id: string, body: { documents?: { name?: string; fileUrl: string }[] }) =>
  api.post(`/concours/${id}/apply`, body);

export const fetchCandidatures = (concoursId: string) =>
  api.get<{ candidatures: unknown[] }>(`/concours/${concoursId}/candidatures`).then((r) => r.data.candidatures);

export const updateCandidature = (
  concoursId: string,
  cid: string,
  body: { status: 'admitted' | 'rejected' | 'pending'; score?: number }
) => api.put(`/concours/${concoursId}/candidatures/${cid}`, body);

export const fetchPublications = () =>
  api.get<{ publications: unknown[] }>('/publications').then((r) => r.data.publications);

export const searchPublications = (q: string) =>
  api.get<{ publications: unknown[] }>('/publications/search', { params: { q } }).then((r) => r.data.publications);

export const createPublication = (body: Record<string, unknown>) => api.post('/publications', body);

export const fetchProjects = () => api.get<{ projects: unknown[] }>('/projects').then((r) => r.data.projects);

export const fetchProjectById = (id: string) =>
  api.get<{ project: Record<string, unknown> }>(`/projects/${id}`).then((r) => r.data.project);

export const fetchDocuments = () => api.get<{ documents: unknown[] }>('/documents').then((r) => r.data.documents);

export const uploadDocument = (formData: FormData) =>
  api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

export const fetchGradeHistory = () =>
  api.get<{ history: unknown[] }>('/grade-history').then((r) => r.data.history);

export type NotificationRow = {
  _id: string;
  kind: string;
  title: string;
  body: string;
  read: boolean;
  createdAt?: string;
};

export const fetchNotifications = () =>
  api.get<{ notifications: NotificationRow[]; unreadCount: number }>('/notifications').then((r) => r.data);

export const markNotificationRead = (id: string) => api.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => api.post('/notifications/read-all');

export const fetchSupervisions = (params?: { supervisor?: string; supervised?: string }) =>
  api.get<{ supervisions: unknown[] }>('/supervisions', { params }).then((r) => r.data.supervisions);

export const createSupervision = (body: {
  supervisorId: string;
  supervisedId: string;
  type: 'thesis' | 'project';
  title: string;
  startDate: string;
}) => api.post('/supervisions', body);

export const updateSupervision = (
  id: string,
  body: { status?: 'active' | 'completed' | 'abandoned'; endDate?: string; title?: string }
) => api.put(`/supervisions/${id}`, body);

export const deleteSupervision = (id: string) => api.delete(`/supervisions/${id}`);

export const fetchTeams = () => api.get<{ teams: unknown[] }>('/teams').then((r) => r.data.teams);
export const fetchTeamById = (id: string) =>
  api.get<{ team: Record<string, unknown>; members: unknown[] }>(`/teams/${id}`).then((r) => r.data);
export const createTeam = (body: { name: string; axis: string; leader: string; description?: string }) =>
  api.post('/teams', body);
export const updateTeam = (id: string, body: { name?: string; axis?: string; leader?: string; description?: string }) =>
  api.put(`/teams/${id}`, body);
export const deleteTeam = (id: string) => api.delete(`/teams/${id}`);
export const addTeamMember = (id: string, userId: string) => api.post(`/teams/${id}/members`, { userId });
export const removeTeamMember = (id: string, userId: string) => api.delete(`/teams/${id}/members/${userId}`);

export type TeamCollaborationRow = {
  _id: string;
  partnerTeam: { _id: string; name: string; axis: string; leader?: { _id?: string; name?: string } };
  note?: string;
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: { name?: string };
  createdAt?: string;
};

export const fetchTeamCollaborations = (teamId: string) =>
  api
    .get<{ collaborations: TeamCollaborationRow[] }>(`/teams/${teamId}/collaborations`)
    .then((r) => r.data.collaborations);

export const addTeamCollaboration = (
  teamId: string,
  body: { partnerTeamId: string; note?: string; startDate?: string; endDate?: string }
) => api.post(`/teams/${teamId}/collaborations`, body);

export const updateTeamCollaboration = (
  teamId: string,
  partnerTeamId: string,
  body: { note?: string; startDate?: string | null; endDate?: string | null }
) => api.put(`/teams/${teamId}/collaborations/${partnerTeamId}`, body);

export const removeTeamCollaboration = (teamId: string, partnerTeamId: string) =>
  api.delete(`/teams/${teamId}/collaborations/${partnerTeamId}`);

export const fetchDepartments = () =>
  api.get<{ departments: string[] }>('/encadrement-requests/departments').then((r) => r.data.departments);

export const fetchEncadreurs = (params?: { q?: string; department?: string }) =>
  api
    .get<{ encadreurs: unknown[]; studentHasActiveSupervision: boolean; departments: string[] }>(
      '/encadrement-requests/encadreurs',
      { params }
    )
    .then((r) => r.data);

export const createEncadrementRequest = (body: { encadreurId: string; message: string }) =>
  api.post('/encadrement-requests', body);

export const fetchEncadrementRequests = (status?: 'pending' | 'accepted' | 'refused') =>
  api
    .get<{ requests: unknown[]; activeSupervisionCount?: number }>('/encadrement-requests', {
      params: status ? { status } : {},
    })
    .then((r) => r.data);

export const updateEncadrementRequest = (
  id: string,
  body: { status: 'accepted' | 'refused'; refusalReason?: string }
) => api.put(`/encadrement-requests/${id}`, body);

export const deleteEncadrementRequest = (id: string) => api.delete(`/encadrement-requests/${id}`);
