import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { 
  insertUserSchema, 
  insertProjectSchema, 
  insertTaskSchema, 
  insertCommentSchema, 
  insertMilestoneSchema,
  userRoleEnum,
  taskStatusEnum,
  taskPriorityEnum,
  projectStatusEnum
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { randomUUID } from "crypto";
import session from "express-session";
import MemoryStore from "memorystore";

// Validations
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const statusUpdateSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "completed"])
});

const reorderTasksSchema = z.array(
  z.object({
    id: z.number(),
    order: z.number()
  })
);

// Set up file storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_engine = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${randomUUID()}-${file.originalname}`;
    cb(null, uniqueFilename);
  }
});

// Set up multer middleware
const upload = multer({ 
  storage: storage_engine,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  }
});

// Auth middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.session.userId) {
    return next();
  }
  
  res.status(401).json({ message: "Unauthorized" });
};

const isAdmin = async (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};

const isManagerOrAdmin = async (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return res.status(403).json({ message: "Forbidden: Manager or Admin access required" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup session store
  const SessionStore = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: new SessionStore({
      checkPeriod: 86400000 // Clear expired sessions every 24h
    })
  }));
  
  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set user in session
      req.session.userId = user.id;
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        avatarColor: user.avatarColor
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: "An error occurred during login" });
    }
  });
  
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Default to member role for new registrations
      const newUser = await storage.createUser({
        ...userData,
        role: 'member'
      });
      
      req.session.userId = newUser.id;
      
      res.status(201).json({ 
        id: newUser.id, 
        username: newUser.username, 
        email: newUser.email, 
        name: newUser.name, 
        role: newUser.role,
        avatarColor: newUser.avatarColor
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: "An error occurred during registration" });
    }
  });
  
  app.get('/api/auth/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }
    
    res.json({ 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      name: user.name, 
      role: user.role,
      avatarColor: user.avatarColor
    });
  });
  
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  // User routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    const users = await storage.getUsers();
    
    // Don't return password field
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt
    }));
    
    res.json(sanitizedUsers);
  });
  
  // Project routes
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    const projects = await storage.getProjectsWithStats();
    res.json(projects);
  });
  
  app.get('/api/projects/:id', isAuthenticated, async (req, res) => {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await storage.getProjectWithStats(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    res.json(project);
  });
  
  app.post('/api/projects', isManagerOrAdmin, async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse({
        ...req.body,
        createdBy: req.session.userId
      });
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: "An error occurred while creating the project" });
    }
  });
  
  app.patch('/api/projects/:id', isManagerOrAdmin, async (req, res) => {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    // Only allow updating certain fields
    const allowedUpdates = ['name', 'description', 'status', 'color', 'progress'];
    const updates: any = {};
    
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    
    const updatedProject = await storage.updateProject(projectId, updates);
    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    res.json(updatedProject);
  });
  
  app.delete('/api/projects/:id', isManagerOrAdmin, async (req, res) => {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const success = await storage.deleteProject(projectId);
    if (!success) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    res.status(204).end();
  });
  
  // Task routes
  app.get('/api/projects/:projectId/tasks', isAuthenticated, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const tasks = await storage.getTasksByProject(projectId);
    res.json(tasks);
  });
  
  app.get('/api/tasks/assigned', isAuthenticated, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const tasks = await storage.getTasksByAssignee(req.session.userId);
    res.json(tasks);
  });
  
  app.get('/api/tasks/:id', isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const task = await storage.getTaskWithRelations(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    res.json(task);
  });
  
  app.post('/api/projects/:projectId/tasks', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const taskData = insertTaskSchema.parse({
        ...req.body,
        projectId,
        createdBy: req.session.userId
      });
      
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: "An error occurred while creating the task" });
    }
  });
  
  app.patch('/api/tasks/:id', isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    // Only allow updating certain fields
    const allowedUpdates = ['title', 'description', 'status', 'priority', 'assignedTo', 'dueDate'];
    const updates: any = {};
    
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    
    const updatedTask = await storage.updateTask(taskId, updates);
    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    res.json(updatedTask);
  });
  
  app.patch('/api/tasks/:id/status', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      const { status } = statusUpdateSchema.parse(req.body);
      
      const updatedTask = await storage.updateTaskStatus(taskId, status);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(updatedTask);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: "An error occurred while updating task status" });
    }
  });
  
  app.post('/api/tasks/reorder', isAuthenticated, async (req, res) => {
    try {
      const taskUpdates = reorderTasksSchema.parse(req.body);
      await storage.updateTaskOrder(taskUpdates);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: "An error occurred while reordering tasks" });
    }
  });
  
  app.delete('/api/tasks/:id', isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const success = await storage.deleteTask(taskId);
    if (!success) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    res.status(204).end();
  });
  
  // File routes
  app.post('/api/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { projectId, taskId } = req.body;
      const parsedProjectId = projectId ? parseInt(projectId) : undefined;
      const parsedTaskId = taskId ? parseInt(taskId) : undefined;
      
      if ((!parsedProjectId && !parsedTaskId) || (parsedProjectId && isNaN(parsedProjectId)) || (parsedTaskId && isNaN(parsedTaskId))) {
        return res.status(400).json({ message: "Must provide valid projectId or taskId" });
      }
      
      const file = await storage.createFile({
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        projectId: parsedProjectId,
        taskId: parsedTaskId,
        uploadedBy: req.session.userId!
      });
      
      res.status(201).json(file);
    } catch (err) {
      res.status(500).json({ message: "An error occurred while uploading the file" });
    }
  });
  
  app.get('/api/projects/:projectId/files', isAuthenticated, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const files = await storage.getFilesByProject(projectId);
    res.json(files);
  });
  
  app.get('/api/tasks/:taskId/files', isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const files = await storage.getFilesByTask(taskId);
    res.json(files);
  });
  
  app.get('/api/files/:filename', isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    
    res.sendFile(filePath);
  });
  
  app.delete('/api/files/:id', isAuthenticated, async (req, res) => {
    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }
    
    const success = await storage.deleteFile(fileId);
    if (!success) {
      return res.status(404).json({ message: "File not found" });
    }
    
    res.status(204).end();
  });
  
  // Comment routes
  app.post('/api/comments', isAuthenticated, async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse({
        ...req.body,
        createdBy: req.session.userId
      });
      
      if (!commentData.taskId && !commentData.projectId) {
        return res.status(400).json({ message: "Comment must be associated with a task or project" });
      }
      
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: "An error occurred while creating the comment" });
    }
  });
  
  app.get('/api/tasks/:taskId/comments', isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const comments = await storage.getCommentsByTask(taskId);
    res.json(comments);
  });
  
  app.get('/api/projects/:projectId/comments', isAuthenticated, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const comments = await storage.getCommentsByProject(projectId);
    res.json(comments);
  });
  
  // Milestone routes
  app.post('/api/projects/:projectId/milestones', isManagerOrAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const milestoneData = insertMilestoneSchema.parse({
        ...req.body,
        projectId
      });
      
      const milestone = await storage.createMilestone(milestoneData);
      res.status(201).json(milestone);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: "An error occurred while creating the milestone" });
    }
  });
  
  app.get('/api/projects/:projectId/milestones', isAuthenticated, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const milestones = await storage.getMilestonesByProject(projectId);
    res.json(milestones);
  });
  
  app.patch('/api/milestones/:id', isManagerOrAdmin, async (req, res) => {
    const milestoneId = parseInt(req.params.id);
    if (isNaN(milestoneId)) {
      return res.status(400).json({ message: "Invalid milestone ID" });
    }
    
    // Only allow updating certain fields
    const allowedUpdates = ['title', 'description', 'dueDate', 'completed'];
    const updates: any = {};
    
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    
    const updatedMilestone = await storage.updateMilestone(milestoneId, updates);
    if (!updatedMilestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }
    
    res.json(updatedMilestone);
  });
  
  app.delete('/api/milestones/:id', isManagerOrAdmin, async (req, res) => {
    const milestoneId = parseInt(req.params.id);
    if (isNaN(milestoneId)) {
      return res.status(400).json({ message: "Invalid milestone ID" });
    }
    
    const success = await storage.deleteMilestone(milestoneId);
    if (!success) {
      return res.status(404).json({ message: "Milestone not found" });
    }
    
    res.status(204).end();
  });
  
  // Activity routes
  app.get('/api/activities/recent', isAuthenticated, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const activities = await storage.getRecentActivities(limit);
    res.json(activities);
  });
  
  // Serve uploaded files statically
  app.use('/uploads', isAuthenticated, express.static(uploadsDir));
  
  return httpServer;
}
