"use client";

import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { Task } from "../types";

interface AISuggestionsBadgeProps {
  task: Task;
}

export const AISuggestionsBadge = ({ task }: AISuggestionsBadgeProps) => {
  if (!task.aiSuggestedAssignees || task.aiSuggestedAssignees.length === 0) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className="text-xs gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200"
    >
      <Sparkles className="size-3" />
      AI Suggested
    </Badge>
  );
};

