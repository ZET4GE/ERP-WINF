export const USER_ROLES = ["admin", "tecnico"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}
