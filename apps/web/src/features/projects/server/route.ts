import { getMember } from "@/features/members/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createProjectSchema, updateProjectSchema } from "../schema";
import { Project, ProjectGenerationType } from "../types";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { TaskStatus } from "@/features/tasks/types";
import { aiClient } from "@/lib/ai-client";
import { COLLECTIONS, createDocument, getDocument, updateDocument, deleteDocument, listDocuments, toApiResponse } from "@/lib/db-helpers";
import { Member } from "@/lib/models/Member";
import { UserSkill } from "@/lib/models/UserSkill";
import { getUserById } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, userSkills, members } from "@/lib/db/schema";
import { eq, and, gte, lte, ne } from "drizzle-orm";

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator("form", createProjectSchema),
    async (c) => {
      const user = c.get("user");

      const { name, image, workspaceId, prompt, generation_type } = c.req.valid("form");
      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      let uploadedImageUrl: string | undefined;
      if (image instanceof File) {
        // Handle image upload - store as base64 data URL
        // TODO: Replace with proper file storage (S3, Cloudinary, etc.)
        try {
          const arrayBuffer = await image.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");
          uploadedImageUrl = `data:image/png;base64,${base64}`;
        } catch (error) {
          console.error("Error processing image:", error);
        }
      }
      const project = await createDocument(COLLECTIONS.projects, {
        name,
        imageUrl: uploadedImageUrl,
        workspaceId,
        generationType: (generation_type || "manual") as ProjectGenerationType,
        prompt: prompt || undefined,
      });

      // If AI generation is requested, generate tasks and assign them
      if (generation_type === "ai_generated" && prompt) {
        try {
          // Get all workspace members with their skills
          const workspaceMembersList = await listDocuments<Member>(COLLECTIONS.members, {
            workspaceId: workspaceId,
          });

          const membersWithSkills = await Promise.all(
            workspaceMembersList.documents.map(async (member) => {
              const userData = await getUserById(member.userId);
              const skillsList = await listDocuments<UserSkill>(COLLECTIONS.userSkills, {
                memberId: member.id,
              });
              return {
                id: member.id,
                name: userData?.name || userData?.email || "Unknown",
                primary_domain: undefined,
                skills: skillsList.documents.map((skill) => ({
                  name: skill.name,
                  category: skill.category,
                  experience_years: skill.experienceYears,
                  proficiency_score: skill.proficiencyScore,
                })),
              };
            })
          );

          // Generate tasks using AI
          const aiTasks = await aiClient.generateTasks(
            prompt,
            project.id,
            member.id
          );

          // Index users and tasks in vector database
          if (membersWithSkills.length > 0) {
            await aiClient.indexUsers(membersWithSkills, project.id, member.id);
          }
          await aiClient.indexTasks(aiTasks, project.id, member.id);

          // Match tasks to users
          const tasksWithMatches = await aiClient.matchUsersForTasks(
            aiTasks,
            project.id,
            member.id
          );

          // Create tasks in database with AI suggestions
          const now = new Date();
          const defaultDueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

          for (let i = 0; i < tasksWithMatches.length; i++) {
            const aiTask = tasksWithMatches[i];
            const matchedUsers = (aiTask as any).matched_users || [];
            const suggestedAssigneeId = matchedUsers.length > 0 ? matchedUsers[0].user_id : undefined;

            // Calculate due date based on estimated hours (assuming 8 hours per day)
            const estimatedDays = Math.ceil(aiTask.estimated_hours / 8);
            const taskDueDate = new Date(now.getTime() + estimatedDays * 24 * 60 * 60 * 1000);

            await createDocument(COLLECTIONS.tasks, {
              name: aiTask.name || `Task ${i + 1}`,
              status: TaskStatus.TODO,
              workspaceId,
              projectId: project.id,
              assigneeId: suggestedAssigneeId || user.$id, // Fallback to current user
              position: (i + 1) * 1000,
              dueDate: taskDueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
              description: aiTask.description || `Complexity: ${aiTask.complexity}/10, Estimated: ${aiTask.estimated_hours}h`,
              dependsOn: aiTask.depends_on || [],
              aiSuggestedAssignees: matchedUsers.map((u: any) => u.user_id),
            });
          }
        } catch (error) {
          console.error("Error generating AI tasks:", error);
          // Continue even if AI generation fails - project is already created
        }
      }

      return c.json({ data: toApiResponse(project) });
    }
  )
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const { workspaceId } = c.req.valid("query");
      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const projectsList = await listDocuments<Project>(COLLECTIONS.projects, {
        workspaceId,
      }, {
        sort: { createdAt: -1 },
      });
      return c.json({ data: { documents: projectsList.documents.map(toApiResponse), total: projectsList.total } });
    }
  )
  .patch(
    "/:projectId",
    sessionMiddleware,
    zValidator("form", updateProjectSchema),
    async (c) => {
      const user = c.get("user");
      const { projectId } = c.req.param();
      const { name, image } = c.req.valid("form");
      const existingProject = await getDocument<Project>(
        COLLECTIONS.projects,
        projectId
      );
      if (!existingProject) {
        return c.json({ error: "Project not found" }, 404);
      }
      const member = await getMember({
        workspaceId: existingProject.workspaceId,
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      let uploadedImageUrl: string | undefined;
      if (image instanceof File) {
        try {
          const arrayBuffer = await image.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");
          uploadedImageUrl = `data:image/png;base64,${base64}`;
        } catch (error) {
          console.error("Error processing image:", error);
        }
      } else {
        uploadedImageUrl = image;
      }
      const project = await updateDocument(
        COLLECTIONS.projects,
        projectId,
        {
          name,
          imageUrl: uploadedImageUrl,
        }
      );
      return c.json({ data: toApiResponse(project) });
    }
  )
  .delete("/:projectId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { projectId } = c.req.param();
    const existingProject = await getDocument<Project>(
      COLLECTIONS.projects,
      projectId
    );
    if (!existingProject) {
      return c.json({ error: "Project not found" }, 404);
    }
    const member = await getMember({
      workspaceId: existingProject.workspaceId,
      userId: user.$id,
    });
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await deleteDocument(COLLECTIONS.projects, projectId);
    return c.json({ data: { $id: projectId } });
  })
  .get("/:projectId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { projectId } = c.req.param();
    const project = await getDocument<Project>(
      COLLECTIONS.projects,
      projectId
    );
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    const member = await getMember({
      workspaceId: project.workspaceId,
      userId: user.$id,
    });
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.json({ data: toApiResponse(project) });
  })
  .get("/:projectId/analytics", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { projectId } = c.req.param();
    const project = await getDocument<Project>(
      COLLECTIONS.projects,
      projectId
    );
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    const member = await getMember({
      workspaceId: project.workspaceId,
      userId: user.$id,
    });
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // This month tasks
    const thisMonthTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month tasks
    const lastMonthTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        gte(tasks.createdAt, lastMonthStart),
        lte(tasks.createdAt, lastMonthEnd)
      )
    );

    const taskCount = thisMonthTasks.length;
    const taskDifference = taskCount - lastMonthTasks.length;

    // This month assigned tasks
    const thisMonthAssignedTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.assigneeId, member.id),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month assigned tasks
    const lastMonthAssignedTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.assigneeId, member.id),
        gte(tasks.createdAt, lastMonthStart),
        lte(tasks.createdAt, lastMonthEnd)
      )
    );

    const assignedTaskCount = thisMonthAssignedTasks.length;
    const assignedTaskDifference = assignedTaskCount - lastMonthAssignedTasks.length;

    // This month incomplete tasks
    const thisMonthIncompleteTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        ne(tasks.status, TaskStatus.DONE),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month incomplete tasks
    const lastMonthIncompleteTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        ne(tasks.status, TaskStatus.DONE),
        gte(tasks.createdAt, lastMonthStart),
        lte(tasks.createdAt, lastMonthEnd)
      )
    );

    const incompleteTaskCount = thisMonthIncompleteTasks.length;
    const incompleteTaskDifference = incompleteTaskCount - lastMonthIncompleteTasks.length;

    // This month complete tasks
    const thisMonthCompleteTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, TaskStatus.DONE),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month complete tasks
    const lastMonthCompleteTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, TaskStatus.DONE),
        gte(tasks.createdAt, lastMonthStart),
        lte(tasks.createdAt, lastMonthEnd)
      )
    );

    const completeTaskCount = thisMonthCompleteTasks.length;
    const completeTaskDifference = completeTaskCount - lastMonthCompleteTasks.length;

    // This month overdue tasks
    const thisMonthOverdueTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        ne(tasks.status, TaskStatus.DONE),
        lte(tasks.dueDate, now.toISOString().split('T')[0]),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month overdue tasks
    const lastMonthOverdueTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.projectId, projectId),
        ne(tasks.status, TaskStatus.DONE),
        lte(tasks.dueDate, now.toISOString().split('T')[0]),
        gte(tasks.createdAt, lastMonthStart),
        lte(tasks.createdAt, lastMonthEnd)
      )
    );

    const overdueTaskCount = thisMonthOverdueTasks.length;
    const overdueTaskDifference = overdueTaskCount - lastMonthOverdueTasks.length;

    return c.json({
      data: {
        taskCount,
        taskDifference,
        assignedTaskCount,
        assignedTaskDifference,
        incompleteTaskCount,
        incompleteTaskDifference,
        completeTaskCount,
        completeTaskDifference,
        overdueTaskCount,
        overdueTaskDifference,
      },
    });
  });

export default app;
