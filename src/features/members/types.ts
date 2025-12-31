import { type Member } from "@/lib/models/Member";
export { MemberRole, type Member } from "@/lib/models/Member";
export { type UserSkill } from "@/lib/models/UserSkill";

export type MemberWithUser = Member & {
  name: string;
  email: string;
};