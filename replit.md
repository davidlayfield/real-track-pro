# Overview

SimpliTask is a real estate development task management application built as a full-stack web application. The system provides project management capabilities with task tracking, file sharing, team collaboration, and activity monitoring specifically tailored for real estate development workflows. It features a modern React frontend with a Node.js/Express backend, PostgreSQL database, and comprehensive task management features including Kanban boards, file uploads, commenting, and real-time activity tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Radix UI components with shadcn/ui design system for accessible, customizable components
- **Styling**: Tailwind CSS with custom theme configuration supporting light/dark modes
- **Build System**: Vite for fast development and optimized production builds
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Session Management**: Express sessions with connect-pg-simple for PostgreSQL-based session storage
- **File Handling**: Multer middleware for multipart/form-data file uploads
- **API Design**: RESTful API endpoints with JSON communication

## Database Design
- **Primary Database**: PostgreSQL with Drizzle ORM schema definition
- **Schema Structure**: 
  - Users table with role-based access (admin, manager, member)
  - Projects table with status tracking and progress metrics
  - Tasks table with priority levels, status workflow, and assignee relationships
  - Files table for document/asset management linked to projects and tasks
  - Comments table for task discussions and collaboration
  - Milestones table for project phase tracking
  - Activities table for audit trail and real-time updates
- **Data Relationships**: Foreign key constraints ensuring referential integrity between users, projects, tasks, and related entities

## Authentication & Authorization
- **Session-Based Authentication**: Traditional server-side sessions stored in PostgreSQL
- **Role-Based Access Control**: Three-tier permission system (admin, manager, member)
- **Context-Based Auth**: React context provider for client-side authentication state
- **Route Protection**: Authentication middleware protecting API endpoints and frontend routes

## File Management System
- **Upload Strategy**: Server-side file storage with Multer handling multipart uploads
- **File Organization**: Uploads directory structure with unique file naming
- **Database Integration**: File metadata stored in database with filesystem references
- **Security**: File type validation and upload size restrictions

## Development & Build Pipeline
- **Development Server**: Vite dev server with HMR and React Fast Refresh
- **Production Build**: Vite build process generating optimized static assets with Express serving SPA
- **TypeScript Configuration**: Strict typing with path aliases for clean imports
- **Database Migrations**: Drizzle Kit for schema migrations and database management

# External Dependencies

## Database Services
- **PostgreSQL**: Primary database system with Neon Database serverless hosting
- **Connection Pooling**: Node.js pg pool for efficient database connections

## UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives for complex components
- **Lucide React**: Modern icon library providing consistent iconography
- **shadcn/ui**: Pre-built component system built on Radix UI with Tailwind styling

## Development Tools
- **Drizzle Kit**: Database schema management and migration tooling
- **TanStack Table**: Advanced data table functionality with sorting, filtering, and pagination
- **Date-fns**: Modern date utility library for date formatting and manipulation
- **Zod**: TypeScript-first schema validation for forms and API validation

## Build & Development Infrastructure
- **Vite**: Modern build tool with fast HMR and optimized production builds
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer plugins
- **ESBuild**: Fast JavaScript bundler for server-side build process

## File Upload & Processing
- **Multer**: Express middleware for handling multipart/form-data file uploads
- **Crypto**: Node.js built-in module for generating unique file identifiers

## Session & Security
- **Connect-pg-simple**: PostgreSQL session store for Express sessions
- **Express Session**: Server-side session management middleware