import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
import { sessionMiddleware } from "@/lib/session-middleware";
import { COLLECTIONS, createDocument, getDocument, updateDocument, deleteDocument, listDocuments, toApiResponse, toApiResponseArray } from "@/lib/db-helpers";
import { MemberRole, Member } from "@/lib/models/Member";
import { Workspace } from "@/lib/models/Workspace";
import { generateInviteCode } from "@/lib/utils";
import { getMember } from "@/features/members/utils";
import { z } from "zod";
import { TaskStatus } from "@/features/tasks/types";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { db } from "@/lib/db";
import { members, workspaces, projects, tasks } from "@/lib/db/schema";
import { eq, inArray, and, gte, lte, ne } from "drizzle-orm";

const app = new Hono()
  .get("/", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const userId = user.$id;

    const membersList = await listDocuments<Member>(COLLECTIONS.members, {
      userId: userId,
    });
    
    if (membersList.total === 0) {
      return c.json({ data: { documents: [], total: 0 } });
    }
    
    const workspaceIds = membersList.documents
      .map((member) => member.workspaceId)
      .filter((id): id is string => id !== null && id !== undefined);
    
    if (workspaceIds.length === 0) {
      return c.json({ data: { documents: [], total: 0 } });
    }

    const workspacesList = await listDocuments(COLLECTIONS.workspaces, {
      id: { $in: workspaceIds },
    }, {
      sort: { createdAt: -1 },
    });
    
    return c.json({ 
      data: {
        documents: toApiResponseArray(workspacesList.documents),
        total: workspacesList.total,
      }
    });
  })
  .post(
    "/",
    zValidator("form", createWorkspaceSchema),
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const userId = user.$id;

      const { name, image } = c.req.valid("form");
      let uploadedImageUrl: string | undefined = undefined;
      
      // Handle image upload - for now, store as base64 data URL
      // TODO: Replace with proper file storage (S3, Cloudinary, etc.)
      if (image instanceof File) {
        try {
          const arrayBuffer = await image.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");
          const mimeType = image.type || "image/png";
          uploadedImageUrl = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error("Error processing image:", error);
          // Continue without image if processing fails
        }
      }
      
      const workspace = await createDocument(COLLECTIONS.workspaces, {
        name,
        userId: userId,
        ...(uploadedImageUrl && { imageUrl: uploadedImageUrl }),
        inviteCode: generateInviteCode(6),
      });

      await createDocument(COLLECTIONS.members, {
        workspaceId: workspace.id,
        userId: userId,
        role: MemberRole.ADMIN,
      });

      return c.json({ data: toApiResponse(workspace) });
    }
  )
  .patch(
    "/:workspaceId",
    sessionMiddleware,
    zValidator("form", updateWorkspaceSchema),
    async (c) => {
      const user = c.get("user");
      const { workspaceId } = c.req.param();
      const { name, image } = c.req.valid("form");
      
      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });
      
      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      
      let uploadedImageUrl: string | undefined = undefined;
      if (image instanceof File) {
        try {
          const arrayBuffer = await image.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");
          const mimeType = image.type || "image/png";
          uploadedImageUrl = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error("Error processing image:", error);
        }
      } else if (image && typeof image === "string") {
        uploadedImageUrl = image;
      }
      
      const updateData: { name?: string; imageUrl?: string } = {};
      if (name) updateData.name = name;
      if (uploadedImageUrl !== undefined) {
        updateData.imageUrl = uploadedImageUrl;
      }
      
      const workspace = await updateDocument(
        COLLECTIONS.workspaces,
        workspaceId,
        updateData
      );
      
      return c.json({ data: toApiResponse(workspace) });
    }
  )
  .delete("/:workspaceId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { workspaceId } = c.req.param();
    
    const member = await getMember({
      workspaceId,
      userId: user.$id,
    });
    
    if (!member || member.role !== MemberRole.ADMIN) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    await deleteDocument(COLLECTIONS.workspaces, workspaceId);
    return c.json({ data: { $id: workspaceId } });
  })
  .get("/:workspaceId/analytics", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { workspaceId } = c.req.param();
    
    const member = await getMember({
      workspaceId,
      userId: user.$id,
    });
    
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get all projects in this workspace
    const workspaceProjects = await listDocuments(COLLECTIONS.projects, {
      workspaceId: workspaceId,
    });

    const projectIds = workspaceProjects.documents.map((p) => p.id);

    if (projectIds.length === 0) {
      // Return empty analytics if no projects
      return c.json({
        data: {
          taskCount: 0,
          taskDifference: 0,
          assignedTaskCount: 0,
          assignedTaskDifference: 0,
          incompleteTaskCount: 0,
          incompleteTaskDifference: 0,
          completeTaskCount: 0,
          completeTaskDifference: 0,
          overdueTaskCount: 0,
          overdueTaskDifference: 0,
        },
      });
    }

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // This month tasks (all projects in workspace)
    const thisMonthTasks = await db.select().from(tasks).where(
      and(
        inArray(tasks.projectId, projectIds),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month tasks
    const lastMonthTasks = await db.select().from(tasks).where(
      and(
        inArray(tasks.projectId, projectIds),
        gte(tasks.createdAt, lastMonthStart),
        lte(tasks.createdAt, lastMonthEnd)
      )
    );

    const taskCount = thisMonthTasks.length;
    const taskDifference = taskCount - lastMonthTasks.length;

    // This month assigned tasks (to current user)
    const thisMonthAssignedTasks = await db.select().from(tasks).where(
      and(
        inArray(tasks.projectId, projectIds),
        eq(tasks.assigneeId, user.id),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month assigned tasks
    const lastMonthAssignedTasks = await db.select().from(tasks).where(
      and(
        inArray(tasks.projectId, projectIds),
        eq(tasks.assigneeId, user.id),
        gte(tasks.createdAt, lastMonthStart),
        lte(tasks.createdAt, lastMonthEnd)
      )
    );

    const assignedTaskCount = thisMonthAssignedTasks.length;
    const assignedTaskDifference = assignedTaskCount - lastMonthAssignedTasks.length;

    // This month incomplete tasks
    const thisMonthIncompleteTasks = await db.select().from(tasks).where(
      and(
        inArray(tasks.projectId, projectIds),
        ne(tasks.status, TaskStatus.DONE),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month incomplete tasks
    const lastMonthIncompleteTasks = await db.select().from(tasks).where(
      and(
        inArray(tasks.projectId, projectIds),
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
        inArray(tasks.projectId, projectIds),
        eq(tasks.status, TaskStatus.DONE),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month complete tasks
    const lastMonthCompleteTasks = await db.select().from(tasks).where(
      and(
        inArray(tasks.projectId, projectIds),
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
        inArray(tasks.projectId, projectIds),
        ne(tasks.status, TaskStatus.DONE),
        lte(tasks.dueDate, now.toISOString().split('T')[0]),
        gte(tasks.createdAt, thisMonthStart),
        lte(tasks.createdAt, thisMonthEnd)
      )
    );

    // Last month overdue tasks  
    const lastMonthOverdueTasks = await db.select().from(tasks).where(
      and(
        inArray(tasks.projectId, projectIds),
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
  })
  .get("/:workspaceId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { workspaceId } = c.req.param();
    
    const member = await getMember({
      workspaceId,
      userId: user.$id,
    });
    
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const workspace = await getDocument(COLLECTIONS.workspaces, workspaceId);
    return c.json({ data: toApiResponse(workspace) });
  });

export default app;
