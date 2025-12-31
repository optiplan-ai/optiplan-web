import { useQuery } from "@tanstack/react-query";
import { aiClient } from "@/lib/ai-client";
import { Task } from "../types";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { UserMatch } from "@/lib/ai-client";

export const useGetAISuggestions = (task: Task | null) => {
  const workspaceId = useWorkspaceId();
  const { data: members } = useGetMembers({ id: workspaceId, type: "workspace" });

  return useQuery({
    queryKey: ["ai-suggestions", task?.$id],
    queryFn: async (): Promise<UserMatch[]> => {
      if (!task || !members?.documents || !task.projectId) {
        return [];
      }

      // Get all members with their skills
      const membersWithSkills = await Promise.all(
        members.documents.map(async (member) => {
          try {
            const skillsResponse = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/members/${member.$id}/skills`
            );
            if (!skillsResponse.ok) {
              return null;
            }
            const { data } = await skillsResponse.json();
            const skills = data as { documents: Array<{
              name: string;
              category: string;
              experience_years: number;
              proficiency_score: number;
            }> };
            if (!member.$id) {
              return null;
            }
            return {
              id: member.$id,
              name: member.name,
              skills: skills.documents.map((skill) => ({
                name: skill.name,
                category: skill.category,
                experience_years: skill.experience_years,
                proficiency_score: skill.proficiency_score,
              })),
            };
          } catch {
            return null;
          }
        })
      );

      const validMembers = membersWithSkills.filter(
        (m): m is NonNullable<typeof m> & { id: string } => 
          m !== null && m.id !== undefined && m.skills.length > 0
      );

      if (validMembers.length === 0) {
        return [];
      }

      // Index users if not already indexed
      try {
        await aiClient.indexUsers(validMembers, task.projectId, "");
      } catch (error) {
        console.error("Error indexing users:", error);
      }

      // Convert task to AI format
      const aiTask = {
        task_id: task.$id,
        name: task.name,
        complexity: 5, // Default complexity
        estimated_hours: 8, // Default estimate
        required_skills: [], // Would need to extract from task description
        project_id: task.projectId,
        manager_id: "", // Would need to get from project
      };

      try {
        const matches = await aiClient.matchUserForTask(
          aiTask,
          task.projectId,
          "" // Manager ID would need to be retrieved
        );
        return matches;
      } catch (error) {
        console.error("Error getting AI suggestions:", error);
        return [];
      }
    },
    enabled: !!task && !!members?.documents && !!task.projectId,
  });
};

