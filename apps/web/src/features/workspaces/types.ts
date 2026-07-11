/** Workspace as serialized over the API (dates become ISO strings in JSON). */
export type Workspace = {
  id: string;
  name: string;
  imageUrl?: string | null;
  inviteCode: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};
