import { z } from "zod";

// AI Service types
export interface AITask {
  task_id: string;
  name: string;
  description?: string;
  complexity: number;
  estimated_hours: number;
  required_skills: AISkill[];
  depends_on?: string[];
  project_id?: string;
  manager_id?: string;
}

export interface AISkill {
  name: string;
  category: string;
  preferred_experience: number;
  required_proficiency: number;
}

export interface UserSkill {
  name: string;
  category: string;
  experience_years: number;
  proficiency_score: number; // 0-100
}

export interface UserWithSkills {
  id: string;
  name: string;
  primary_domain?: string;
  skills: UserSkill[];
}

export interface TaskMatch {
  task_id: string;
  name: string;
  match_score: number;
  min_complexity: number;
  time_estimate: number;
  skill_coverage: number;
}

export interface UserMatch {
  user_id: string;
  name: string;
  match_score: number;
  skill_coverage: number;
}

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

class AIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = AI_SERVICE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Service error: ${error}`);
    }

    return response.json();
  }

  async generateTasks(
    projectDescription: string,
    projectId: string,
    managerId: string
  ): Promise<AITask[]> {
    const response = await this.request<{ tasks: AITask[] }>(
      "/generate-tasks",
      {
        method: "POST",
        body: JSON.stringify({
          project_description: projectDescription,
          project_id: projectId,
          manager_id: managerId,
        }),
      }
    );
    return response.tasks;
  }

  async indexUsers(
    users: UserWithSkills[],
    projectId: string,
    managerId: string
  ): Promise<void> {
    await this.request("/index-users", {
      method: "POST",
      body: JSON.stringify({
        users,
        project_id: projectId,
        manager_id: managerId,
      }),
    });
  }

  async indexTasks(
    tasks: AITask[],
    projectId: string,
    managerId: string
  ): Promise<void> {
    await this.request("/index-tasks", {
      method: "POST",
      body: JSON.stringify({
        tasks,
        project_id: projectId,
        manager_id: managerId,
      }),
    });
  }

  async matchUsersForTasks(
    tasks: AITask[],
    projectId: string,
    managerId: string
  ): Promise<AITask[]> {
    const response = await this.request<{ tasks: AITask[] }>(
      "/match-users-for-tasks",
      {
        method: "POST",
        body: JSON.stringify({
          tasks,
          project_id: projectId,
          manager_id: managerId,
        }),
      }
    );
    return response.tasks;
  }

  async matchTasksForUsers(
    users: UserWithSkills[],
    projectId: string,
    managerId: string
  ): Promise<UserWithSkills[]> {
    const response = await this.request<{ users: UserWithSkills[] }>(
      "/match-tasks-for-users",
      {
        method: "POST",
        body: JSON.stringify({
          users,
          project_id: projectId,
          manager_id: managerId,
        }),
      }
    );
    return response.users;
  }

  async matchUserForTask(
    task: AITask,
    projectId: string,
    managerId: string
  ): Promise<UserMatch[]> {
    const response = await this.request<{ task: AITask; matched_users: UserMatch[] }>(
      "/match-user-for-task",
      {
        method: "POST",
        body: JSON.stringify({
          task,
          project_id: projectId,
          manager_id: managerId,
        }),
      }
    );
    return response.matched_users;
  }

  async matchTasksForUser(
    user: UserWithSkills,
    projectId: string,
    managerId: string
  ): Promise<TaskMatch[]> {
    const response = await this.request<{ user: UserWithSkills; matched_tasks: TaskMatch[] }>(
      "/match-tasks-for-user",
      {
        method: "POST",
        body: JSON.stringify({
          user,
          project_id: projectId,
          manager_id: managerId,
        }),
      }
    );
    return response.matched_tasks;
  }
}

export const aiClient = new AIClient();

