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