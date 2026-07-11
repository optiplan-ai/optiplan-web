import { getDocument, listDocuments, COLLECTIONS } from "@/lib/db-helpers";
import { Member } from "@/lib/models/Member";

export async function getMember({
  workspaceId,
  userId,
  projectId,
}: {
  workspaceId?: string;
  userId: string;
  projectId?: string;
}): Promise<(Member & { id: string; $id: string }) | null> {
  const filter: any = {
    userId: userId,
  };

  if (workspaceId) {
    filter.workspaceId = workspaceId;
  }

  if (projectId) {
    filter.projectId = projectId;
  }

  const result = await listDocuments<Member>(COLLECTIONS.members, filter, {
    limit: 1,
  });

  if (result.documents.length === 0) {
    return null;
  }

  const member = result.documents[0];
  return {
    ...member,
    $id: member.id,
  };
}
