"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { useCreateProjectModal } from "../hooks/use-create-project-modal";
import { CreateProjectForm } from "@/features/projects/components/create-project-form";

export const CreateProjectModal = () => {
  const { isOpen, setIsOpen, close, useAI } = useCreateProjectModal();
  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
      <CreateProjectForm onCancel={close} useAI={useAI}/>
    </ResponsiveModal>
  );
};
