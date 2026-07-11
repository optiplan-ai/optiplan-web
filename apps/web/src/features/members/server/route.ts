import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { getMember } from "../utils";
import { COLLECTIONS, createDocument, getDocument, updateDocument, deleteDocument, listDocuments, toApiResponse, toApiResponseArray, toObjectId } from "@/lib/db-helpers";
import { MemberRole, Member } from "@/lib/models/Member";
import { Workspace } from "@/lib/models/Workspace";
import { getUserById } from "@/lib/auth";
import { UserSkill } from "@/lib/models/UserSkill";

const app = new Hono()
  .get(
    "/",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        workspaceId: z.string().optional(),
        projectId: z.string().optional(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { workspaceId, projectId } = c.req.valid("query");
      const member = await getMember({
        ...(workspaceId && { workspaceId }),
        ...(projectId && { projectId }),
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      let members;
      if (workspaceId) {
        members = await listDocuments<Member>(COLLECTIONS.members, {
          workspaceId: toObjectId(workspaceId),
        });
      } else if (projectId) {
        members = await listDocuments<Member>(COLLECTIONS.members, {
          projectId: toObjectId(projectId),
        });
      } else {
        return c.json(
          { error: "Either workspaceId or projectId is required" },
          400
        );
      }

      const populatedMembers = await Promise.all(
        members.documents.map(async (member) => {
          const userDoc = await getUserById(member.userId?.toString() || "");
          return {
            ...toApiResponse(member),
            name: userDoc?.name || userDoc?.email || "Unknown",
            email: userDoc?.email || "",
          };
        })
      );
      return c.json({ data: { documents: populatedMembers, total: members.total } });
    }
  )
  .delete("/:memberId", sessionMiddleware, async (c) => {
    const { memberId } = c.req.param();
    const user = c.get("user");
    const memberToDelete = await getDocument<Member>(COLLECTIONS.members, memberId);
    if (!memberToDelete || !memberToDelete.workspaceId) {
      return c.json({ error: "Member not found" }, 404);
    }
    const allMembersInWorkspace = await listDocuments<Member>(COLLECTIONS.members, {
      workspaceId: memberToDelete.workspaceId,
    });
    const member = await getMember({
      workspaceId: memberToDelete.workspaceId.toString(),
      userId: user.$id,
    });
    const workspace = await getDocument<Workspace>(COLLECTIONS.workspaces, memberToDelete.workspaceId);
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (member.$id !== memberToDelete.id && member.role !== MemberRole.ADMIN) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (workspace && workspace.userId.toString() === memberToDelete.userId.toString()) {
      return c.json({ error: "Cannot delete the owner of the workspace" }, 400);
    }
    if (allMembersInWorkspace.total === 1) {
      return c.json(
        { error: "Cannot delete the only member of the workspace" },
        409
      );
    }
    await deleteDocument(COLLECTIONS.members, memberId);
      return c.json({ data: { $id: memberToDelete.id } });
  })
  .patch(
    "/:memberId",
    sessionMiddleware,
    zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
    async (c) => {
      const { memberId } = c.req.param();
      const { role } = c.req.valid("json");
      const user = c.get("user");
      const memberToUpdate = await getDocument<Member>(COLLECTIONS.members, memberId);
      if (!memberToUpdate || !memberToUpdate.workspaceId) {
        return c.json({ error: "Member not found" }, 404);
      }
      const allMembersInWorkspace = await listDocuments<Member>(COLLECTIONS.members, {
        workspaceId: memberToUpdate.workspaceId,
      });
      const member = await getMember({
        workspaceId: memberToUpdate.workspaceId.toString(),
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      if (member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      if (memberToUpdate.id === member.$id && role !== MemberRole.ADMIN) {
        return c.json(
          { error: "Cannot downgrade the owner of the workspace" },
          400
        );
      }
      if (memberToUpdate.id === member.$id && role === MemberRole.ADMIN) {
        return c.json({ error: "You are already an administrator" }, 409);
      }
      if (allMembersInWorkspace.total === 1) {
        return c.json(
          { error: "Cannot downgrade the only member of the workspace" },
          400
        );
      }
      const updated = await updateDocument<Member>(COLLECTIONS.members, memberId, {
        role,
      });
      return c.json({ data: toApiResponse(updated) });
    }
  )
  .get("/:memberId/skills", sessionMiddleware, async (c) => {
    const { memberId } = c.req.param();
    const user = c.get("user");
    const member = await getDocument<Member>(COLLECTIONS.members, memberId);
    if (!member || !member.workspaceId) {
      return c.json({ error: "Member not found" }, 404);
    }
    const currentMember = await getMember({
      workspaceId: member.workspaceId.toString(),
      userId: user.$id,
    });
    if (!currentMember) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    // Users can only view their own skills, or admins can view anyone's
    if (currentMember.$id !== member.id && currentMember.role !== MemberRole.ADMIN) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const skills = await listDocuments(COLLECTIONS.userSkills, {
      memberId: toObjectId(memberId),
    });
    return c.json({ data: { documents: toApiResponseArray(skills.documents), total: skills.total } });
  })
  .post(
    "/:memberId/skills",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        skills: z.array(
          z.object({
            name: z.string(),
            category: z.string(),
            experience_years: z.number().min(0).max(50),
            proficiency_score: z.number().min(0).max(100),
          })
        ),
      })
    ),
    async (c) => {
      const { memberId } = c.req.param();
      const { skills } = c.req.valid("json");
      const user = c.get("user");
      const member = await getDocument<Member>(COLLECTIONS.members, memberId);
      if (!member || !member.workspaceId) {
        return c.json({ error: "Member not found" }, 404);
      }
      const currentMember = await getMember({
        workspaceId: member.workspaceId.toString(),
        userId: user.$id,
      });
      if (!currentMember) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      // Users can only update their own skills, or admins can update anyone's
      if (currentMember.$id !== member.id && currentMember.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      // Delete existing skills
      const existingSkills = await listDocuments(COLLECTIONS.userSkills, {
        memberId: toObjectId(memberId),
      });
      await Promise.all(
        existingSkills.documents.map((skill) =>
          deleteDocument(COLLECTIONS.userSkills, skill.id)
        )
      );
      // Create new skills
      const newSkills = await Promise.all(
        skills.map((skill) =>
          createDocument(COLLECTIONS.userSkills, {
            memberId: toObjectId(memberId)!,
            workspaceId: member.workspaceId!,
            name: skill.name,
            category: skill.category,
            experience_years: skill.experience_years,
            proficiency_score: skill.proficiency_score,
          })
        )
      );
      return c.json({ data: { documents: toApiResponseArray(newSkills) } });
    }
  );

export default app;
