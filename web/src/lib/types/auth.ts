export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: string;
  quotaMinutes: number;
  usedMinutes: number;
  quotaStorage: number;
  projectCount?: number;
  memberCount?: number;
}

export interface WorkspaceMember {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  organization: Organization | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ProfileResponse {
  user: User;
  organization: Organization;
}

export interface WorkspaceResponse {
  organization: Organization;
  members: WorkspaceMember[];
  recentProjects: WorkspaceProject[];
}

export interface AdminOverview {
  metrics: {
    userCount: number;
    organizationCount: number;
    projectCount: number;
    usedMinutes: number;
    availableCodes: number;
    completedJobs: number;
    pendingJobs: number;
  };
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    organization: string;
    usedMinutes: number;
    quotaMinutes: number;
    projectCount: number;
  }[];
}

export interface RegistrationCodeRecord {
  id: string;
  code: string;
  note: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  usedBy: { id: string; name: string; email: string } | null;
}
