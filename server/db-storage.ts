import { db } from './db';
import { IStorage } from './storage';
import { eq, and, desc, asc, sql, isNull, inArray } from 'drizzle-orm';
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

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProjectsWithStats(): Promise<ProjectWithStats[]> {
    const allProjects = await this.getProjects();
    
    return Promise.all(allProjects.map(async (project) => {
      const projectTasks = await this.getTasksByProject(project.id);
      const taskCount = projectTasks.length;
      const completedTaskCount = projectTasks.filter(task => task.status === 'completed').length;
      
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
    
    const projectTasks = await this.getTasksByProject(id);
    const taskCount = projectTasks.length;
    const completedTaskCount = projectTasks.filter(task => task.status === 'completed').length;
    
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

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
    const newProject = result[0];
    
    // Log activity
    await this.createActivity({
      type: 'create',
      entityType: 'project',
      entityId: newProject.id,
      description: `created project ${newProject.name}`,
      userId: newProject.createdBy
    });
    
    return newProject;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const result = await db.update(projects)
      .set(projectUpdate)
      .where(eq(projects.id, id))
      .returning();
    
    return result[0];
  }

  async deleteProject(id: number): Promise<boolean> {
    // First, delete all related records
    const tasks = await this.getTasksByProject(id);
    for (const task of tasks) {
      await this.deleteTask(task.id);
    }
    
    const milestones = await this.getMilestonesByProject(id);
    for (const milestone of milestones) {
      await this.deleteMilestone(milestone.id);
    }
    
    await db.delete(files).where(eq(files.projectId, id));
    await db.delete(comments).where(eq(comments.projectId, id));
    
    // Finally, delete the project
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    
    return result.length > 0;
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
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
    return await db.select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.order));
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return await db.select()
      .from(tasks)
      .where(eq(tasks.assignedTo, userId))
      .orderBy(asc(tasks.dueDate));
  }

  async createTask(task: InsertTask): Promise<Task> {
    // Get maximum order in the project + 1
    const projectTasks = await this.getTasksByProject(task.projectId);
    const maxOrder = projectTasks.length > 0 
      ? Math.max(...projectTasks.map(t => t.order))
      : -1;
    
    const order = task.order !== undefined ? task.order : maxOrder + 1;
    
    const result = await db.insert(tasks).values({...task, order}).returning();
    const newTask = result[0];
    
    // Log activity
    await this.createActivity({
      type: 'create',
      entityType: 'task',
      entityId: newTask.id,
      description: `created task ${newTask.title}`,
      userId: newTask.createdBy
    });
    
    return newTask;
  }

  async updateTask(id: number, taskUpdate: Partial<Task>): Promise<Task | undefined> {
    const oldTask = await this.getTask(id);
    if (!oldTask) return undefined;
    
    const result = await db.update(tasks)
      .set(taskUpdate)
      .where(eq(tasks.id, id))
      .returning();
    
    const updatedTask = result[0];
    
    // Log activity for assignment change
    if (taskUpdate.assignedTo && taskUpdate.assignedTo !== oldTask.assignedTo) {
      const assignee = await this.getUser(taskUpdate.assignedTo);
      await this.createActivity({
        type: 'update',
        entityType: 'task',
        entityId: id,
        description: `assigned task ${updatedTask.title} to ${assignee?.name || 'someone'}`,
        userId: taskUpdate.assignedTo
      });
    }
    
    return updatedTask;
  }

  async updateTaskStatus(id: number, status: string): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task) return undefined;
    
    const result = await db.update(tasks)
      .set({ status: status as any })
      .where(eq(tasks.id, id))
      .returning();
    
    const updatedTask = result[0];
    
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
    // This needs to be done in a transaction for data consistency
    for (const update of taskUpdates) {
      await db.update(tasks)
        .set({ order: update.order })
        .where(eq(tasks.id, update.id));
    }
    return true;
  }

  async deleteTask(id: number): Promise<boolean> {
    const task = await this.getTask(id);
    if (!task) return false;
    
    // Delete associated comments and files
    await db.delete(comments).where(eq(comments.taskId, id));
    await db.delete(files).where(eq(files.taskId, id));
    
    // Log activity
    await this.createActivity({
      type: 'delete',
      entityType: 'task',
      entityId: id,
      description: `deleted task ${task.title}`,
      userId: task.createdBy
    });
    
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  // File methods
  async createFile(file: InsertFile): Promise<File> {
    const result = await db.insert(files).values(file).returning();
    const newFile = result[0];
    
    // Log activity
    await this.createActivity({
      type: 'upload',
      entityType: file.taskId ? 'task' : 'project',
      entityId: file.taskId || file.projectId || 0,
      description: `uploaded file ${file.originalName}`,
      userId: file.uploadedBy
    });
    
    return newFile;
  }

  async getFilesByProject(projectId: number): Promise<File[]> {
    return await db.select()
      .from(files)
      .where(eq(files.projectId, projectId))
      .orderBy(desc(files.uploadedAt));
  }

  async getFilesByTask(taskId: number): Promise<File[]> {
    return await db.select()
      .from(files)
      .where(eq(files.taskId, taskId))
      .orderBy(desc(files.uploadedAt));
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id)).returning();
    return result.length > 0;
  }

  // Comment methods
  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values(comment).returning();
    const newComment = result[0];
    
    // Log activity
    await this.createActivity({
      type: 'comment',
      entityType: comment.taskId ? 'task' : 'project',
      entityId: comment.taskId || comment.projectId || 0,
      description: 'commented',
      userId: comment.createdBy
    });
    
    return newComment;
  }

  async getCommentsByTask(taskId: number): Promise<Comment[]> {
    return await db.select()
      .from(comments)
      .where(eq(comments.taskId, taskId))
      .orderBy(asc(comments.createdAt));
  }

  async getCommentsByProject(projectId: number): Promise<Comment[]> {
    return await db.select()
      .from(comments)
      .where(eq(comments.projectId, projectId))
      .orderBy(asc(comments.createdAt));
  }

  // Milestone methods
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const result = await db.insert(milestones).values(milestone).returning();
    const newMilestone = result[0];
    
    // Log activity
    await this.createActivity({
      type: 'create',
      entityType: 'milestone',
      entityId: milestone.projectId,
      description: `added milestone ${milestone.title}`,
      userId: 1 // Default to admin - in a real app we would get this from the request
    });
    
    return newMilestone;
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return await db.select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(asc(milestones.dueDate));
  }

  async updateMilestone(id: number, milestone: Partial<Milestone>): Promise<Milestone | undefined> {
    const result = await db.update(milestones)
      .set(milestone)
      .where(eq(milestones.id, id))
      .returning();
    
    return result[0];
  }

  async deleteMilestone(id: number): Promise<boolean> {
    const result = await db.delete(milestones).where(eq(milestones.id, id)).returning();
    return result.length > 0;
  }

  // Activity methods
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(activity).returning();
    return result[0];
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    return await db.select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  // Helper for seeding initial data
  async seedInitialData(): Promise<void> {
    // Check if there are already users
    const existingUsers = await this.getUsers();
    if (existingUsers.length > 0) {
      console.log('Database already has users, skipping seed');
      return;
    }

    console.log('Seeding initial data...');
    
    // Create admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "password", // In a real app, this would be hashed
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      avatarColor: "#2563eb"
    };
    await this.createUser(adminUser);
    
    // Create some example users
    const users = [
      { username: "sarah", password: "password", email: "sarah@example.com", name: "Sarah Johnson", role: "manager", avatarColor: "#22c55e" },
      { username: "michael", password: "password", email: "michael@example.com", name: "Michael Chen", role: "member", avatarColor: "#f59e0b" },
      { username: "jessica", password: "password", email: "jessica@example.com", name: "Jessica Lee", role: "member", avatarColor: "#ef4444" },
      { username: "david", password: "password", email: "david@example.com", name: "David Wilson", role: "member", avatarColor: "#0369a1" }
    ];
    
    for (const user of users) {
      await this.createUser(user as InsertUser);
    }
    
    console.log('Seed completed');
  }
}