import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { sql } from "drizzle-orm";
import { db } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Initializing database schema", "db");
    
    // First make sure all tables are created
    // We'll use direct SQL to create all the tables if they don't exist
    // These SQL statements match our schema in schema.ts
    await db.execute(sql.raw(`
      -- Create enums
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE project_status AS ENUM ('planning', 'on_track', 'at_risk', 'delayed', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      
      -- Create tables
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'member',
        avatar_color TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status project_status NOT NULL DEFAULT 'planning',
        color TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by INTEGER NOT NULL REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status task_status NOT NULL DEFAULT 'todo',
        priority task_priority NOT NULL DEFAULT 'medium',
        project_id INTEGER NOT NULL REFERENCES projects(id),
        assigned_to INTEGER REFERENCES users(id),
        due_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by INTEGER NOT NULL REFERENCES users(id),
        "order" INTEGER NOT NULL DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        project_id INTEGER REFERENCES projects(id),
        task_id INTEGER REFERENCES tasks(id),
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        task_id INTEGER REFERENCES tasks(id),
        project_id INTEGER REFERENCES projects(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        due_date TIMESTAMPTZ,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `));
    
    // Seed initial data if needed
    await storage.seedInitialData();
    log("Database schema initialized successfully", "db");
  } catch (error) {
    log(`Database initialization error: ${error}`, "db");
    console.error("Database initialization failed:", error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
