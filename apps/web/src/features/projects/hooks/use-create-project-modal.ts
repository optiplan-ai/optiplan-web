import { useQueryState, parseAsBoolean } from "nuqs";

export const useCreateProjectModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "create-project",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
  );
  const [useAI, setUseAI] = useQueryState(
    "use-ai",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
  );
  const genAIProject = () => {
    setUseAI(true);
    setIsOpen(true);
  };
  const open = () => {
    setUseAI(false);
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    setUseAI(false);
  };
  return {
    isOpen,
    open,
    close,
    setIsOpen,
    useAI,
    genAIProject,
  };
};
