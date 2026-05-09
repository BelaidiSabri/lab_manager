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

export const fetchMembersDirectory = () =>
  api.get<{ members: { id: string; name: string; email: string; role: string; currentGrade?: string }[] }>('/members').then((r) => r.data.members);

export const fetchUserDetail = (id: string, includeSupervisions?: boolean) =>
  api
    .get<{
      user: Record<string, unknown>;
      profile: unknown;
      supervisions?: { asSupervisor: unknown[]; asSupervised: unknown[] };
      gradeHistory?: unknown[];
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
