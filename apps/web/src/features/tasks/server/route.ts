import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTaskSchema } from "../schemas";
import { getMember } from "@/features/members/utils";
import { Member } from "@/lib/models/Member";
import { z } from "zod";
import { Task, TaskStatus } from "../types";
import { COLLECTIONS, createDocument, getDocument, updateDocument, deleteDocument, listDocuments, toApiResponse } from "@/lib/db-helpers";
import { Project } from "@/features/projects/types";
import { getUserById } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and, desc, asc, inArray, or, like, sql } from "drizzle-orm";

const app = new Hono()
  .delete("/:taskId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { taskId } = c.req.param();
    const task = await getDocument<Task>(
      COLLECTIONS.tasks,
      taskId
    );
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }
    const member = await getMember({
      workspaceId: task.workspaceId,
      userId: user.$id,
    });
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await deleteDocument(COLLECTIONS.tasks, taskId);
    return c.json({ data: { $id: taskId } });
  })
  .get(
    "/",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        workspaceId: z.string(),
        projectId: z.string().nullish(),
        assigneeId: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        search: z.string().nullish(),
        dueDate: z.string().nullish(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { workspaceId, projectId, status, search, dueDate, assigneeId } =
        c.req.valid("query");
      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Build filter conditions
      const conditions = [eq(tasks.workspaceId, workspaceId)];
      if (projectId) {
        conditions.push(eq(tasks.projectId, projectId));
      }
      if (status) {
        conditions.push(eq(tasks.status, status));
      }
      if (assigneeId) {
        conditions.push(eq(tasks.assigneeId, assigneeId));
      }
      if (dueDate) {
        conditions.push(eq(tasks.dueDate, dueDate));
      }
      if (search) {
        conditions.push(like(tasks.name, `%${search}%`));
      }

      const tasksList = await db.select().from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt));

      // Get unique project and assignee IDs
      const projectIds = [...new Set(tasksList.map(t => t.projectId).filter(Boolean))];
      const assigneeIds = [...new Set(tasksList.map(t => t.assigneeId).filter((id): id is string => Boolean(id)))];

      // Fetch projects and assignees
      const projectsList = projectIds.length > 0
        ? await listDocuments<Project>(COLLECTIONS.projects, {
            id: { $in: projectIds },
          })
        : { documents: [], total: 0 };

      const assignees = await Promise.all(
        assigneeIds.map(async (assigneeId) => {
          const userData = await getUserById(assigneeId);
          return {
            id: assigneeId,
            $id: assigneeId,
            name: userData?.name || userData?.email || "Unknown",
            email: userData?.email || "",
          };
        })
      );

      const populatedTasks = tasksList.map((task) => {
        const project = projectsList.documents.find(
          (p) => p.id === task.projectId
        );
        const assignee = task.assigneeId 
          ? assignees.find((a) => a.id === task.assigneeId)
          : null;
        return {
          ...toApiResponse(task),
          project: project ? toApiResponse(project) : null,
          assignee,
        };
      });

      return c.json({ data: { documents: populatedTasks, total: tasksList.length } });
    }
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createTaskSchema),
    async (c) => {
      const user = c.get("user");
      const { name, status, workspaceId, projectId, dueDate, assigneeId, description } =
        c.req.valid("json");
      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Find highest position for this status
      const highestPositionTask = await db.select().from(tasks)
        .where(and(
          eq(tasks.status, status),
          eq(tasks.workspaceId, workspaceId)
        ))
        .orderBy(asc(tasks.position))
        .limit(1);

      const newPosition =
        highestPositionTask.length > 0
          ? highestPositionTask[0].position + 1000
          : 1000;

      // Format dueDate as YYYY-MM-DD string
      const formattedDueDate = dueDate instanceof Date 
        ? dueDate.toISOString().split('T')[0] 
        : String(dueDate).split('T')[0];

      // Validate assignee and convert member ID to user ID if needed
      let finalAssigneeId: string | undefined = undefined;
      if (assigneeId) {
        // First, try to get as a member (frontend sends member IDs)
        const assigneeMember = await getDocument<Member>(COLLECTIONS.members, assigneeId);
        if (assigneeMember) {
          // It's a member ID, validate it belongs to this workspace
          if (assigneeMember.workspaceId !== workspaceId) {
            return c.json({ error: `Assignee is not a member of this workspace` }, 400);
          }
          finalAssigneeId = assigneeMember.userId;
        } else {
          // It might be a user ID directly, validate the user exists and is a workspace member
          const assigneeUser = await getUserById(assigneeId);
          if (!assigneeUser) {
            return c.json({ error: `Assignee with ID ${assigneeId} not found` }, 400);
          }
          // Verify the user is a member of this workspace
          const assigneeMemberCheck = await getMember({
            workspaceId,
            userId: assigneeId,
          });
          if (!assigneeMemberCheck) {
            return c.json({ error: `Assignee is not a member of this workspace` }, 400);
          }
          finalAssigneeId = assigneeId;
        }
      }

      const task = await createDocument(COLLECTIONS.tasks, {
        name,
        status: status || TaskStatus.TODO,
        workspaceId,
        projectId: projectId || undefined,
        dueDate: formattedDueDate,
        assigneeId: finalAssigneeId,
        position: newPosition,
        description: description || undefined,
      });
      return c.json({ data: toApiResponse(task) });
    }
  )
  .patch(
    "/:taskId",
    sessionMiddleware,
    zValidator("json", createTaskSchema.partial()),
    async (c) => {
      const user = c.get("user");
      const { name, status, description, projectId, dueDate, assigneeId } =
        c.req.valid("json");
      const { taskId } = c.req.param();
      const existingTask = await getDocument<Task>(
        COLLECTIONS.tasks,
        taskId
      );
      if (!existingTask) {
        return c.json({ error: "Task not found" }, 404);
      }
      const member = await getMember({
        workspaceId: existingTask.workspaceId,
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (status !== undefined) updateData.status = status;
      if (projectId !== undefined) updateData.projectId = projectId;
      if (dueDate !== undefined) {
        updateData.dueDate = dueDate instanceof Date 
          ? dueDate.toISOString().split('T')[0] 
          : String(dueDate).split('T')[0];
      }
      if (assigneeId !== undefined) {
        // Validate assignee and convert member ID to user ID if needed
        let finalAssigneeId: string | null = null;
        if (assigneeId) {
          // First, try to get as a member (frontend sends member IDs)
          const assigneeMember = await getDocument<Member>(COLLECTIONS.members, assigneeId);
          if (assigneeMember) {
            // It's a member ID, validate it belongs to this workspace
            if (assigneeMember.workspaceId !== existingTask.workspaceId) {
              return c.json({ error: `Assignee is not a member of this workspace` }, 400);
            }
            finalAssigneeId = assigneeMember.userId;
          } else {
            // It might be a user ID directly, validate the user exists and is a workspace member
            const assigneeUser = await getUserById(assigneeId);
            if (!assigneeUser) {
              return c.json({ error: `Assignee with ID ${assigneeId} not found` }, 400);
            }
            // Verify the user is a member of this workspace
            const assigneeMemberCheck = await getMember({
              workspaceId: existingTask.workspaceId,
              userId: assigneeId,
            });
            if (!assigneeMemberCheck) {
              return c.json({ error: `Assignee is not a member of this workspace` }, 400);
            }
            finalAssigneeId = assigneeId;
          }
        }
        updateData.assigneeId = finalAssigneeId;
      }
      if (description !== undefined) updateData.description = description;

      const task = await updateDocument(
        COLLECTIONS.tasks,
        taskId,
        updateData
      );
      return c.json({ data: toApiResponse(task) });
    }
  )
  .get("/:taskId", sessionMiddleware, async (c) => {
    const { taskId } = c.req.param();
    const currentUser = c.get("user");

    const task = await getDocument<Task>(
      COLLECTIONS.tasks,
      taskId
    );
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    const currentMember = await getMember({
      workspaceId: task.workspaceId,
      userId: currentUser.$id,
    });
    if (!currentMember) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const project = task.projectId
      ? await getDocument<Project>(
          COLLECTIONS.projects,
          task.projectId
        )
      : null;

    const assigneeUser = task.assigneeId ? await getUserById(task.assigneeId) : null;
    const assignee = assigneeUser ? {
      id: task.assigneeId!,
      $id: task.assigneeId!,
      name: assigneeUser.name || assigneeUser.email || "Unknown",
      email: assigneeUser.email || "",
    } : null;

    return c.json({
      data: {
        ...toApiResponse(task),
        project: project ? toApiResponse(project) : null,
        assignee,
      },
    });
  })
  .post(
    "/bulk-update",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        tasks: z.array(
          z.object({
            $id: z.string(),
            status: z.nativeEnum(TaskStatus),
            position: z.number().int().positive().min(1000).max(1_000_000),
          })
        ),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { tasks: tasksToUpdate } = c.req.valid("json");
      const taskIds = tasksToUpdate.map((t) => t.$id);

      const existingTasks = await db.select().from(tasks)
        .where(inArray(tasks.id, taskIds));

      if (existingTasks.length === 0) {
        return c.json({ error: "No tasks found" }, 404);
      }

      const workspaceIds = new Set(existingTasks.map((t) => t.workspaceId));
      if (workspaceIds.size !== 1) {
        return c.json({ error: "All tasks must belong to the same workspace" }, 400);
      }

      const workspaceId = Array.from(workspaceIds)[0];
      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const updatedTasks = await Promise.all(
        tasksToUpdate.map(async (task) => {
          const { $id, status, position } = task;
          return updateDocument<Task>(COLLECTIONS.tasks, $id, {
            status,
            position,
          });
        })
      );

      return c.json({ data: updatedTasks.map(toApiResponse) });
    }
  );

export default app;
