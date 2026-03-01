export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  roles: UserRoleWithRole[];
}

export interface UserRoleWithRole {
  id: number;
  role: {
    id: number;
    name: string;
  };
}

export interface DeviceWithRoles {
  id: number;
  uuid: string;
  macAddress?: string;
  section?: string;
  location?: string;
  ipAddress?: string;
  apiToken?: string;
  roles: DeviceRoleWithRole[];
}

export interface DeviceRoleWithRole {
  id: number;
  role: {
    id: number;
    name: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}