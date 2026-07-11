import { listDocuments, COLLECTIONS } from "@/lib/db-helpers";
import { Member } from "@/lib/models/Member";
import { Workspace } from "@/lib/models/Workspace";

export const getWorkspaces = async (userId: string) => {
  const members = await listDocuments<Member>(COLLECTIONS.members, {
    userId: userId,
  });
  if (members.total === 0) {
    return { documents: [], total: 0 };
  }
  const workspaceIds = members.documents
    .map((member) => member.workspaceId)
    .filter((id): id is string => id !== null && id !== undefined);
  
  if (workspaceIds.length === 0) {
    return { documents: [], total: 0 };
  }

  const workspaces = await listDocuments<Workspace>(COLLECTIONS.workspaces, {
    id: { $in: workspaceIds },
  }, {
    sort: { createdAt: -1 },
  });
  return workspaces;
};
