"use client";

import { useGetAISuggestions } from "../api/use-get-ai-suggestions";
import { Task } from "../types";
import { MembersAvatar } from "@/features/members/components/members-avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateTask } from "../api/use-update-task";
import { toast } from "sonner";

interface AISuggestionsPanelProps {
  task: Task;
  memberOptions: { id: string; name: string }[];
}

export const AISuggestionsPanel = ({
  task,
  memberOptions,
}: AISuggestionsPanelProps) => {
  const { data: suggestions, isLoading } = useGetAISuggestions(task);
  const { mutate: updateTask } = useUpdateTask();

  const handleAssign = (memberId: string) => {
    updateTask(
      {
        json: { assigneeId: memberId },
        param: { taskId: task.$id },
      },
      {
        onSuccess: () => {
          toast.success("Task assigned successfully");
        },
        onError: () => {
          toast.error("Failed to assign task");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading AI suggestions...</div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-purple-600" />
        AI Suggested Assignees
      </div>
      <div className="space-y-2">
        {suggestions.slice(0, 3).map((suggestion, index) => {
          const member = memberOptions.find((m) => m.id === suggestion.user_id);
          if (!member) return null;

          return (
            <div
              key={suggestion.user_id}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <MembersAvatar name={member.name} className="size-6" />
                <span className="text-sm font-medium">{member.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(suggestion.match_score * 100)}% match
                </Badge>
                {index === 0 && (
                  <Badge variant="outline" className="text-xs bg-purple-50">
                    Best Match
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAssign(suggestion.user_id)}
                disabled={task.assigneeId === suggestion.user_id}
              >
                {task.assigneeId === suggestion.user_id ? "Assigned" : "Assign"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

