import { api } from '../api/client';

export type PublicConcours = {
  _id: string;
  title: string;
  description?: string;
  department?: string;
  targetGrade: string;
  startDate?: string;
  endDate?: string;
  status: 'open' | 'closed' | 'finished';
};

export type PublicLabInfo = {
  labName: string;
  tagline: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
};

export async function fetchPublicConcours(): Promise<PublicConcours[]> {
  const { data } = await api.get<{ concours: PublicConcours[] }>('/public/concours');
  return data.concours;
}

export async function fetchPublicLabInfo(): Promise<PublicLabInfo> {
  const { data } = await api.get<PublicLabInfo>('/public/lab');
  return data;
}
