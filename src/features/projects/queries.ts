import { getDocument, COLLECTIONS } from "@/lib/db-helpers";
import { Project } from "./types";
import { getMember } from "../members/utils";

interface GetProjectProps {
  projectId: string;
  userId: string;
}

export const getProject = async ({ projectId, userId }: GetProjectProps) => {
  try {
    const project = await getDocument<Project>(
      COLLECTIONS.projects,
      projectId
    );
    if (!project) {
      return null;
    }

    const member = await getMember({
      workspaceId: project.workspaceId,
      userId,
    });
    if (!member) {
      return null;
    }

    return project;
  } catch {
    return null;
  }
};
