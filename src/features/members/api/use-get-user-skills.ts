import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { UserSkillDocument } from "../types";

export const useGetUserSkills = (memberId: string) => {
  return useQuery({
    queryKey: ["user-skills", memberId],
    queryFn: async () => {
      const response = await client.api.members[":memberId"]["skills"].$get({
        param: { memberId },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user skills");
      }
      const { data } = await response.json();
      return data as { documents: UserSkillDocument[] };
    },
    enabled: !!memberId,
  });
};

