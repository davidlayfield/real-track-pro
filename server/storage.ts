import { 
  users, projects, tasks, files, comments, milestones, activities,
  type User, type InsertUser, 
  type Project, type InsertProject, 
  type Task, type InsertTask, 
  type File, type InsertFile, 
  type Comment, type InsertComment, 
  type Milestone, type InsertMilestone, 
  type Activity, type InsertActivity,
  type TaskWithRelations,
  type ProjectWithStats
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjects(): Promise<Project[]>;
  getProjectsWithStats(): Promise<ProjectWithStats[]>;
  getProjectWithStats(id: number): Promise<ProjectWithStats | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Task methods
  getTask(id: number): Promise<Task | undefined>;
  getTaskWithRelations(id: number): Promise<TaskWithRelations | undefined>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTasksByAssignee(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  updateTaskStatus(id: number, status: string): Promise<Task | undefined>;
  updateTaskOrder(tasks: { id: number, order: number }[]): Promise<boolean>;
  deleteTask(id: number): Promise<boolean>;
  
  // File methods
  createFile(file: InsertFile): Promise<File>;
  getFilesByProject(projectId: number): Promise<File[]>;
  getFilesByTask(taskId: number): Promise<File[]>;
  deleteFile(id: number): Promise<boolean>;
  
  // Comment methods
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByTask(taskId: number): Promise<Comment[]>;
  getCommentsByProject(projectId: number): Promise<Comment[]>;
  
  // Milestone methods
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  updateMilestone(id: number, milestone: Partial<Milestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: number): Promise<boolean>;
  
  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivities(limit: number): Promise<Activity[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private tasks: Map<number, Task>;
  private files: Map<number, File>;
  private comments: Map<number, Comment>;
  private milestones: Map<number, Milestone>;
  private activities: Map<number, Activity>;
  
  private currentUserId: number;
  private currentProjectId: number;
  private currentTaskId: number;
  private currentFileId: number;
  private currentCommentId: number;
  private currentMilestoneId: number;
  private currentActivityId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.files = new Map();
    this.comments = new Map();
    this.milestones = new Map();
    this.activities = new Map();
    
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentTaskId = 1;
    this.currentFileId = 1;
    this.currentCommentId = 1;
    this.currentMilestoneId = 1;
    this.currentActivityId = 1;
    
    // Add some initial data
    this.seedInitialData();
  }

  private seedInitialData(): void {
    // Create admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "password", // In a real app, this would be hashed
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      avatarColor: "#2563eb"
    };
    this.createUser(adminUser);
    
    // Create some example users
    const users = [
      { username: "sarah", password: "password", email: "sarah@example.com", name: "Sarah Johnson", role: "manager", avatarColor: "#22c55e" },
      { username: "michael", password: "password", email: "michael@example.com", name: "Michael Chen", role: "member", avatarColor: "#f59e0b" },
      { username: "jessica", password: "password", email: "jessica@example.com", name: "Jessica Lee", role: "member", avatarColor: "#ef4444" },
      { username: "david", password: "password", email: "david@example.com", name: "David Wilson", role: "member", avatarColor: "#0369a1" }
    ];
    
    users.forEach(user => this.createUser(user as InsertUser));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProjectsWithStats(): Promise<ProjectWithStats[]> {
    const projects = await this.getProjects();
    
    return Promise.all(projects.map(async (project) => {
      const tasks = await this.getTasksByProject(project.id);
      const taskCount = tasks.length;
      const completedTaskCount = tasks.filter(task => task.status === 'completed').length;
      
      // Get next milestone
      const milestones = await this.getMilestonesByProject(project.id);
      const uncompletedMilestones = milestones
        .filter(m => !m.completed)
        .sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      
      const nextMilestone = uncompletedMilestones[0];
      
      // Calculate progress
      const progress = taskCount > 0 
        ? Math.round((completedTaskCount / taskCount) * 100)
        : 0;
      
      return {
        ...project,
        taskCount,
        completedTaskCount,
        nextMilestone,
        progress
      };
    }));
  }

  async getProjectWithStats(id: number): Promise<ProjectWithStats | undefined> {
    const project = await this.getProject(id);
    if (!project) return undefined;
    
    const tasks = await this.getTasksByProject(id);
    const taskCount = tasks.length;
    const completedTaskCount = tasks.filter(task => task.status === 'completed').length;
    
    // Get next milestone
    const milestones = await this.getMilestonesByProject(id);
    const uncompletedMilestones = milestones
      .filter(m => !m.completed)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    
    const nextMilestone = uncompletedMilestones[0];
    
    // Calculate progress
    const progress = taskCount > 0 
      ? Math.round((completedTaskCount / taskCount) * 100)
      : 0;
    
    // Update project progress
    await this.updateProject(id, { progress });
    
    return {
      ...project,
      progress,
      taskCount,
      completedTaskCount,
      nextMilestone
    };
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const createdAt = new Date();
    const project: Project = { ...insertProject, id, createdAt };
    this.projects.set(id, project);
    
    // Log activity
    await this.createActivity({
      type: 'create',
      entityType: 'project',
      entityId: id,
      description: `created project ${project.name}`,
      userId: project.createdBy
    });
    
    return project;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...projectUpdate };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const deleted = this.projects.delete(id);
    
    if (deleted) {
      // Delete associated tasks, files, comments, milestones
      const tasks = await this.getTasksByProject(id);
      for (const task of tasks) {
        await this.deleteTask(task.id);
      }
      
      // Delete milestones
      const milestones = await this.getMilestonesByProject(id);
      for (const milestone of milestones) {
        await this.deleteMilestone(milestone.id);
      }
    }
    
    return deleted;
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTaskWithRelations(id: number): Promise<TaskWithRelations | undefined> {
    const task = await this.getTask(id);
    if (!task) return undefined;
    
    const project = await this.getProject(task.projectId);
    const assignee = task.assignedTo ? await this.getUser(task.assignedTo) : undefined;
    const creator = await this.getUser(task.createdBy);
    
    return {
      ...task,
      project,
      assignee,
      creator
    };
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.assignedTo === userId)
      .sort((a, b) => {
        // Sort by due date, null dates at the end
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const createdAt = new Date();
    
    // Get maximum order in the project + 1
    const projectTasks = await this.getTasksByProject(insertTask.projectId);
    const maxOrder = projectTasks.length > 0 
      ? Math.max(...projectTasks.map(t => t.order))
      : -1;
    
    const order = insertTask.order !== undefined ? insertTask.order : maxOrder + 1;
    
    const task: Task = { ...insertTask, id, createdAt, order };
    this.tasks.set(id, task);
    
    // Log activity
    await this.createActivity({
      type: 'create',
      entityType: 'task',
      entityId: id,
      description: `created task ${task.title}`,
      userId: task.createdBy
    });
    
    return task;
  }

  async updateTask(id: number, taskUpdate: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskUpdate };
    this.tasks.set(id, updatedTask);
    
    // Log activity for assignment change
    if (taskUpdate.assignedTo && taskUpdate.assignedTo !== task.assignedTo) {
      const assignee = await this.getUser(taskUpdate.assignedTo);
      await this.createActivity({
        type: 'update',
        entityType: 'task',
        entityId: id,
        description: `assigned task ${task.title} to ${assignee?.name || 'someone'}`,
        userId: taskUpdate.assignedTo
      });
    }
    
    return updatedTask;
  }

  async updateTaskStatus(id: number, status: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, status: status as any };
    this.tasks.set(id, updatedTask);
    
    // Log activity
    if (status === 'completed') {
      await this.createActivity({
        type: 'complete',
        entityType: 'task',
        entityId: id,
        description: `completed task ${task.title}`,
        userId: task.assignedTo || task.createdBy
      });
    } else {
      await this.createActivity({
        type: 'update',
        entityType: 'task',
        entityId: id,
        description: `updated task ${task.title} status to ${status}`,
        userId: task.assignedTo || task.createdBy
      });
    }
    
    return updatedTask;
  }

  async updateTaskOrder(taskUpdates: { id: number, order: number }[]): Promise<boolean> {
    for (const update of taskUpdates) {
      const task = this.tasks.get(update.id);
      if (task) {
        this.tasks.set(update.id, { ...task, order: update.order });
      }
    }
    return true;
  }

  async deleteTask(id: number): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;
    
    // Delete associated comments and files
    const comments = await this.getCommentsByTask(id);
    for (const comment of comments) {
      this.comments.delete(comment.id);
    }
    
    const files = await this.getFilesByTask(id);
    for (const file of files) {
      this.files.delete(file.id);
    }
    
    // Log activity
    await this.createActivity({
      type: 'delete',
      entityType: 'task',
      entityId: id,
      description: `deleted task ${task.title}`,
      userId: task.createdBy
    });
    
    return this.tasks.delete(id);
  }

  // File methods
  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.currentFileId++;
    const uploadedAt = new Date();
    const file: File = { ...insertFile, id, uploadedAt };
    this.files.set(id, file);
    
    // Log activity
    await this.createActivity({
      type: 'upload',
      entityType: insertFile.taskId ? 'task' : 'project',
      entityId: insertFile.taskId || insertFile.projectId || 0,
      description: `uploaded file ${insertFile.originalName}`,
      userId: insertFile.uploadedBy
    });
    
    return file;
  }

  async getFilesByProject(projectId: number): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.projectId === projectId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  async getFilesByTask(taskId: number): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.taskId === taskId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  async deleteFile(id: number): Promise<boolean> {
    return this.files.delete(id);
  }

  // Comment methods
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const createdAt = new Date();
    const comment: Comment = { ...insertComment, id, createdAt };
    this.comments.set(id, comment);
    
    // Log activity
    await this.createActivity({
      type: 'comment',
      entityType: insertComment.taskId ? 'task' : 'project',
      entityId: insertComment.taskId || insertComment.projectId || 0,
      description: 'commented',
      userId: insertComment.createdBy
    });
    
    return comment;
  }

  async getCommentsByTask(taskId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.taskId === taskId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getCommentsByProject(projectId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Milestone methods
  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const id = this.currentMilestoneId++;
    const createdAt = new Date();
    const milestone: Milestone = { ...insertMilestone, id, createdAt };
    this.milestones.set(id, milestone);
    return milestone;
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return Array.from(this.milestones.values())
      .filter(milestone => milestone.projectId === projectId)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }

  async updateMilestone(id: number, milestoneUpdate: Partial<Milestone>): Promise<Milestone | undefined> {
    const milestone = this.milestones.get(id);
    if (!milestone) return undefined;
    
    const updatedMilestone = { ...milestone, ...milestoneUpdate };
    this.milestones.set(id, updatedMilestone);
    
    // Log activity if completed
    if (milestoneUpdate.completed && milestoneUpdate.completed !== milestone.completed) {
      const project = await this.getProject(milestone.projectId);
      await this.createActivity({
        type: 'complete',
        entityType: 'milestone',
        entityId: id,
        description: `completed milestone ${milestone.title} for ${project?.name}`,
        userId: project?.createdBy || 1 // Fallback to admin
      });
    }
    
    return updatedMilestone;
  }

  async deleteMilestone(id: number): Promise<boolean> {
    return this.milestones.delete(id);
  }

  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const createdAt = new Date();
    const activity: Activity = { ...insertActivity, id, createdAt };
    this.activities.set(id, activity);
    return activity;
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
