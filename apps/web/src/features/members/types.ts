import { type Member } from "@/lib/models/Member";
export { MemberRole, type Member } from "@/lib/models/Member";
export { type UserSkill } from "@/lib/models/UserSkill";

export type MemberWithUser = {
  $id: string;
  userId?: string;
  workspaceId?: string | null;
  projectId?: string | null;
  role?: "ADMIN" | "MEMBER";
  createdAt?: string;
  updatedAt?: string;
  name: string;
  email: string;
};

export type UserSkillFormData = {
  name: string;
  category: string;
  experience_years: number;
  proficiency_score: number;
};

export type UserSkillDocument = {
  $id: string;
  name: string;
  category: string;
  experience_years: number;
  proficiency_score: number;
  createdAt?: string;
  updatedAt?: string;
  workspaceId?: string;
  memberId?: string;
};