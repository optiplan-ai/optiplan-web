export enum ProjectGenerationType {
  MANUAL = "manual",
  AI_GENERATED = "ai_generated",
}

/** Project as serialized over the API (dates become ISO strings in JSON). */
export type Project = {
  id: string;
  name: string;
  imageUrl?: string | null;
  workspaceId: string;
  generationType?: ProjectGenerationType | null;
  prompt?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated use Project */
export type ProjectWithApiResponse = Project;
