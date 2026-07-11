import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface useGetMembersProps {
  id: string;
  type: "workspace" | "project";
}

export const useGetMembers = ({ id, type }: useGetMembersProps) => {
  let workspaceId: string | undefined
  let projectId: string | undefined
  if (type === "workspace") {
    workspaceId = id
  } else {
    projectId = id
  }
  return useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      const response = await client.api.members.$get({
        query: { 
          ...(workspaceId && { workspaceId }),
          ...(projectId && { projectId }),
         },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch members of ${type}`);
      }
      const { data } = await response.json();
      return data;
    },
  });
};
