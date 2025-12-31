export enum ProjectGenerationType {
  MANUAL = "manual",
  AI_GENERATED = "ai_generated",
}

export type Project = {
  $id: string;
  id: string;
  name: string;
  imageUrl?: string;
  workspaceId: string;
  generationType?: ProjectGenerationType;
  prompt?: string;
  createdAt: Date;
  updatedAt: Date;
};
