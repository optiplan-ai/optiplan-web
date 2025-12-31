import { Card, CardContent } from "@/components/ui/card";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Loader } from "lucide-react";
import { useGetTask } from "../api/use-get-task";
import { EditTaskForm } from "./edit-task-form";

interface EditTaskFormWrapperProps {
  onCancel: () => void;
  id: string;
}

export const EditTaskFormWrapper = ({
  onCancel,
  id,
}: EditTaskFormWrapperProps) => {
  const workspaceId = useWorkspaceId();
  const { data: initialValues, isLoading: isLoadingTask } = useGetTask({
    taskId: id,
  });
  const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
    workspaceId,
  });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({
    type: "workspace",
    id: workspaceId,
  });
  const projectOptions = projects?.documents
    .filter((project): project is NonNullable<typeof project> => project !== null && project.$id !== undefined)
    .map((project) => ({
      id: project.$id,
      name: project.name,
      imageUrl: project.imageUrl,
    }));
  const memberOptions = members?.documents
    .filter((member): member is typeof member & { $id: string } => member.$id !== undefined)
    .map((member) => ({
      id: member.$id,
      name: member.name,
    }));
  const isLoading = isLoadingMembers || isLoadingProjects || isLoadingTask;

  if (isLoading) {
    return (
      <Card className="w-full h-[714px] border-none shadow-none">
        <CardContent className="flex items-center justify-center h-full">
          <Loader className="animate-spin size-5 text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  if (!initialValues) {
    return null;
  }
  return (
    <EditTaskForm
      onCancel={onCancel}
      initialValues={{ ...initialValues, id: initialValues.$id ?? "" }}
      projectOptions={projectOptions ?? []}
      memberOptions={memberOptions ?? []}
    />
  );
};
