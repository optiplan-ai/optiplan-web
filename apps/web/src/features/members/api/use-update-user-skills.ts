import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

type UserSkillInput = {
  name: string;
  category: string;
  experienceYears: number;
  proficiencyScore: number;
};

export const useUpdateUserSkills = (memberId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skills: UserSkillInput[]) => {
      const response = await client.api.members[":memberId"]["skills"].$post({
        param: { memberId },
        json: {
          skills: skills.map((skill) => ({
            name: skill.name,
            category: skill.category,
            experience_years: skill.experienceYears,
            proficiency_score: skill.proficiencyScore,
          })),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to update user skills");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-skills", memberId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Skills updated successfully");
    },
    onError: () => {
      toast.error("Failed to update skills");
    },
  });
};

