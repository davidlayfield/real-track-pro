import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useDragAndDrop } from "@/lib/dnd";
import { useLocation } from "wouter";
import { 
  Calendar, 
  ClipboardList, 
  Clock, 
  Flag, 
  Paperclip, 
  Plus, 
  ChevronLeft, 
  Edit, 
  Trash2, 
  MessageSquare,
  Users
} from "lucide-react";
import { formatDistance, format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import Avatar from "@/components/Avatar";
import TaskCard from "@/components/TaskCard";
import FileUpload from "@/components/FileUpload";
import ActivityItem from "@/components/ActivityItem";

// Task creation form schema
const taskFormSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

// Milestone form schema
const milestoneFormSchema = z.object({
  title: z.string().min(1, "Milestone title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;

// Comment form schema
const commentFormSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

export default function ProjectDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const { isManager, user } = useAuth();
  const { toast } = useToast();
  
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);
  const [isNewMilestoneDialogOpen, setIsNewMilestoneDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Get query parameter for task ID
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const taskId = searchParams.get("task");
    
    if (taskId) {
      // Fetch task details and open the dialog
      const getTask = async () => {
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const taskData = await response.json();
            setSelectedTask(taskData);
            setIsTaskDetailDialogOpen(true);
            
            // Clean URL without reloading page
            const cleanURL = window.location.pathname;
            window.history.replaceState({}, document.title, cleanURL);
          }
        } catch (error) {
          console.error("Error fetching task:", error);
        }
      };
      
      getTask();
    }
  }, []);

  // Fetch project data
  const { 
    data: project, 
    isLoading: isProjectLoading 
  } = useQuery({ 
    queryKey: [`/api/projects/${id}`],
    enabled: !!id
  });

  // Fetch tasks, users, and milestones
  const { 
    data: tasks = [], 
    isLoading: isTasksLoading 
  } = useQuery({ 
    queryKey: [`/api/projects/${id}/tasks`],
    enabled: !!id
  });

  const { 
    data: users = [] 
  } = useQuery({ 
    queryKey: ['/api/users'] 
  });

  const { 
    data: milestones = [], 
    isLoading: isMilestonesLoading 
  } = useQuery({ 
    queryKey: [`/api/projects/${id}/milestones`],
    enabled: !!id
  });

  const { 
    data: files = [], 
    isLoading: isFilesLoading 
  } = useQuery({ 
    queryKey: [`/api/projects/${id}/files`],
    enabled: !!id
  });

  const { 
    data: comments = [], 
    isLoading: isCommentsLoading 
  } = useQuery({ 
    queryKey: [`/api/projects/${id}/comments`],
    enabled: !!id
  });

  // Setup drag and drop functionality
  const { handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useDragAndDrop(id);

  // Initialize task form
  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      assignedTo: "",
    },
  });

  // Initialize milestone form
  const milestoneForm = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
    },
  });

  // Initialize comment form
  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: "",
    },
  });

  // Task comment form
  const taskCommentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: "",
    },
  });

  // Create task mutation
  const createTask = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      const payload = {
        ...data,
        status: 'todo', // Explicitly set default status to 'todo'
        assignedTo: data.assignedTo && data.assignedTo !== "unassigned" ? parseInt(data.assignedTo) : undefined,
      };
      return apiRequest('POST', `/api/projects/${id}/tasks`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      setIsNewTaskDialogOpen(false);
      taskForm.reset();
      toast({
        title: "Task created",
        description: "The task has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create task",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Update task status mutation
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number, status: string }) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      toast({
        title: "Task updated",
        description: "The task status has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update task",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Create milestone mutation
  const createMilestone = useMutation({
    mutationFn: async (data: MilestoneFormValues) => {
      return apiRequest('POST', `/api/projects/${id}/milestones`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/milestones`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      setIsNewMilestoneDialogOpen(false);
      milestoneForm.reset();
      toast({
        title: "Milestone created",
        description: "The milestone has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create milestone",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProject = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/projects/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setLocation('/projects');
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete project",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Add comment to project mutation
  const addProjectComment = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      return apiRequest('POST', '/api/comments', {
        content: data.content,
        projectId: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/comments`] });
      commentForm.reset();
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add comment",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Add comment to task mutation
  const addTaskComment = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      return apiRequest('POST', '/api/comments', {
        content: data.content,
        taskId: selectedTask.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${selectedTask?.id}/comments`] });
      taskCommentForm.reset();
      toast({
        title: "Comment added",
        description: "Your comment has been added to the task",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add comment",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Group tasks by status with debugging
  console.log("Tasks from API:", tasks);
  
  const tasksByStatus = {
    todo: Array.isArray(tasks) ? tasks.filter((task: any) => task.status === 'todo').sort((a: any, b: any) => a.order - b.order) : [],
    in_progress: Array.isArray(tasks) ? tasks.filter((task: any) => task.status === 'in_progress').sort((a: any, b: any) => a.order - b.order) : [],
    review: Array.isArray(tasks) ? tasks.filter((task: any) => task.status === 'review').sort((a: any, b: any) => a.order - b.order) : [],
    completed: Array.isArray(tasks) ? tasks.filter((task: any) => task.status === 'completed').sort((a: any, b: any) => a.order - b.order) : [],
  };
  
  console.log("Tasks grouped by status:", tasksByStatus);

  // Handle task submission
  async function onSubmitTask(data: TaskFormValues) {
    createTask.mutate(data);
  }

  // Handle milestone submission
  async function onSubmitMilestone(data: MilestoneFormValues) {
    createMilestone.mutate(data);
  }

  // Handle comment submission
  async function onSubmitComment(data: CommentFormValues) {
    addProjectComment.mutate(data);
  }

  // Handle task comment submission
  async function onSubmitTaskComment(data: CommentFormValues) {
    addTaskComment.mutate(data);
  }

  // Open task detail dialog
  const openTaskDetail = (task: any) => {
    setSelectedTask(task);
    setIsTaskDetailDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy');
  };

  if (isProjectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium">Project not found</h2>
        <p className="text-secondary mt-2">The project you're looking for doesn't exist or has been deleted.</p>
        <Button className="mt-4" onClick={() => setLocation('/projects')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Project Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="mr-2"
            onClick={() => setLocation('/projects')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: project.color }}
              ></div>
              <h1 className="text-2xl font-semibold text-gray-800">{project.name}</h1>
            </div>
            <p className="text-sm text-secondary mt-1">
              {project.description || "No description provided"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isManager() && (
            <>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={() => setIsDeleteAlertOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Project Status and Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">Status</p>
              <Badge 
                className={
                  project.status === 'on_track' ? "bg-green-100 text-green-800" :
                  project.status === 'at_risk' ? "bg-yellow-100 text-yellow-800" :
                  project.status === 'delayed' ? "bg-red-100 text-red-800" :
                  project.status === 'planning' ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }
              >
                {project.status === 'on_track' ? 'On Track' :
                 project.status === 'at_risk' ? 'At Risk' :
                 project.status === 'delayed' ? 'Delayed' :
                 project.status === 'planning' ? 'Planning' :
                 project.status === 'completed' ? 'Completed' :
                 project.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-gray-700">Progress</p>
              <div className="mt-2">
                <Progress value={project.progress} className="h-2" />
                <p className="text-sm font-medium mt-1">{project.progress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-gray-700">Tasks</p>
              <div className="flex items-center mt-1">
                <p className="text-lg font-medium">{tasks.length}</p>
                <p className="text-sm text-muted-foreground ml-2">
                  ({tasks.filter((t: any) => t.status === 'completed').length} completed)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-gray-700">Next Milestone</p>
              {project.nextMilestone ? (
                <div className="mt-1">
                  <p className="text-sm font-medium">{project.nextMilestone.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.nextMilestone.dueDate ? 
                      formatDate(project.nextMilestone.dueDate) : 
                      'No due date'
                    }
                  </p>
                </div>
              ) : (
                <p className="text-sm mt-1">No upcoming milestones</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Tabs */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>
        
        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-medium">Tasks</h2>
            <Button onClick={() => setIsNewTaskDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* To Do Column */}
            <div>
              <div className="bg-slate-700/90 p-3 rounded-t-md flex items-center justify-between">
                <h3 className="font-medium text-sm text-white">To Do</h3>
                <Badge variant="outline" className="bg-white">{tasksByStatus.todo.length}</Badge>
              </div>
              <div 
                className="bg-neutral-200/50 rounded-b-md p-2 min-h-[200px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'todo')}
              >
                {isTasksLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByStatus.todo.length > 0 ? (
                  tasksByStatus.todo.map((task: any) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      users={users} 
                      projects={[project]}
                      onClick={() => openTaskDetail(task)}
                      onDragStart={(e) => handleDragStart(task)}
                    />
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-secondary">
                    No tasks yet
                  </div>
                )}
              </div>
            </div>
            
            {/* In Progress Column */}
            <div>
              <div className="bg-blue-500/90 p-3 rounded-t-md flex items-center justify-between">
                <h3 className="font-medium text-sm text-white">In Progress</h3>
                <Badge variant="outline" className="bg-white">{tasksByStatus.in_progress.length}</Badge>
              </div>
              <div 
                className="bg-neutral-200/50 rounded-b-md p-2 min-h-[200px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'in_progress')}
              >
                {isTasksLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByStatus.in_progress.length > 0 ? (
                  tasksByStatus.in_progress.map((task: any) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      users={users} 
                      projects={[project]}
                      onClick={() => openTaskDetail(task)}
                      onDragStart={(e) => handleDragStart(task)}
                    />
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-secondary">
                    No tasks in progress
                  </div>
                )}
              </div>
            </div>
            
            {/* Review Column */}
            <div>
              <div className="bg-amber-500/90 p-3 rounded-t-md flex items-center justify-between">
                <h3 className="font-medium text-sm text-white">In Review</h3>
                <Badge variant="outline" className="bg-white">{tasksByStatus.review.length}</Badge>
              </div>
              <div 
                className="bg-neutral-200/50 rounded-b-md p-2 min-h-[200px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'review')}
              >
                {isTasksLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByStatus.review.length > 0 ? (
                  tasksByStatus.review.map((task: any) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      users={users} 
                      projects={[project]}
                      onClick={() => openTaskDetail(task)}
                      onDragStart={(e) => handleDragStart(task)}
                    />
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-secondary">
                    No tasks in review
                  </div>
                )}
              </div>
            </div>
            
            {/* Completed Column */}
            <div>
              <div className="bg-green-600/90 p-3 rounded-t-md flex items-center justify-between">
                <h3 className="font-medium text-sm text-white">Completed</h3>
                <Badge variant="outline" className="bg-white">{tasksByStatus.completed.length}</Badge>
              </div>
              <div 
                className="bg-neutral-200/50 rounded-b-md p-2 min-h-[200px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'completed')}
              >
                {isTasksLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByStatus.completed.length > 0 ? (
                  tasksByStatus.completed.map((task: any) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      users={users} 
                      projects={[project]}
                      onClick={() => openTaskDetail(task)}
                      onDragStart={(e) => handleDragStart(task)}
                    />
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-secondary">
                    No completed tasks
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-medium">Milestones</h2>
            {isManager() && (
              <Button onClick={() => setIsNewMilestoneDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            )}
          </div>
          
          {isMilestonesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : milestones.length > 0 ? (
            <div className="space-y-4">
              {milestones.map((milestone: any) => (
                <Card key={milestone.id} className={milestone.completed ? "opacity-75" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium flex items-center">
                          {milestone.completed && (
                            <span className="text-green-500 mr-2">✓</span>
                          )}
                          {milestone.title}
                        </h3>
                        {milestone.description && (
                          <p className="text-sm text-secondary mt-1">{milestone.description}</p>
                        )}
                      </div>
                      {milestone.dueDate && (
                        <div className="text-sm flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-secondary" />
                          <span>{formatDate(milestone.dueDate)}</span>
                        </div>
                      )}
                    </div>
                    
                    {isManager() && !milestone.completed && (
                      <div className="mt-4 flex justify-end">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={async () => {
                            try {
                              await apiRequest('PATCH', `/api/milestones/${milestone.id}`, { completed: true });
                              queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/milestones`] });
                              toast({
                                title: "Milestone completed",
                                description: "The milestone has been marked as completed",
                              });
                            } catch (error) {
                              toast({
                                title: "Failed to update milestone",
                                description: error instanceof Error ? error.message : "An unexpected error occurred",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Mark as Completed
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium">No Milestones Yet</h3>
                <p className="text-sm text-secondary mt-1 mb-4">
                  {isManager() 
                    ? "Start by adding key milestones for this project."
                    : "No milestones have been added to this project yet."
                  }
                </p>
                {isManager() && (
                  <Button onClick={() => setIsNewMilestoneDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Milestone
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Files Tab */}
        <TabsContent value="files">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-medium">Files</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {isFilesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : files.length > 0 ? (
                <div className="bg-white border border-neutral-300 rounded-lg overflow-hidden">
                  <div className="bg-neutral-100 p-3 border-b border-neutral-300 text-sm font-medium">
                    Project Files
                  </div>
                  <div className="divide-y divide-neutral-300">
                    {files.map((file: any) => {
                      const fileUploader = users.find((u: any) => u.id === file.uploadedBy);
                      const fileDate = new Date(file.uploadedAt);
                      
                      return (
                        <div key={file.id} className="p-3 flex items-center justify-between hover:bg-neutral-50">
                          <div className="flex items-center">
                            <Paperclip className="h-5 w-5 text-neutral-400 mr-3" />
                            <div>
                              <a 
                                href={`/api/files/${file.filename}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:text-primary"
                              >
                                {file.originalName}
                              </a>
                              <p className="text-xs text-secondary">
                                {formatDistance(fileDate, new Date(), { addSuffix: true })} 
                                {fileUploader && ` by ${fileUploader.name}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-secondary">
                            {(file.size / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Paperclip className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                    <h3 className="text-lg font-medium">No Files Yet</h3>
                    <p className="text-sm text-secondary mt-1 mb-4">
                      Upload project files using the form on the right.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upload File</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload projectId={id} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Comments Tab */}
        <TabsContent value="comments">
          <div className="mb-4">
            <h2 className="text-lg font-medium">Comments</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {isCommentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment: any) => {
                    const commenter = users.find((u: any) => u.id === comment.createdBy);
                    
                    return (
                      <div key={comment.id} className="bg-white p-4 rounded-lg border border-neutral-300">
                        <div className="flex">
                          <div className="flex-shrink-0 mr-3">
                            {commenter ? (
                              <Avatar 
                                name={commenter.name} 
                                color={commenter.avatarColor} 
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-neutral-300"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{commenter?.name || 'Unknown User'}</p>
                              <p className="text-xs text-secondary">
                                {formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                              </p>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                    <h3 className="text-lg font-medium">No Comments Yet</h3>
                    <p className="text-sm text-secondary mt-1">
                      Be the first to add a comment to this project.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Comment</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...commentForm}>
                    <form onSubmit={commentForm.handleSubmit(onSubmitComment)} className="space-y-4">
                      <FormField
                        control={commentForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter your comment here..." 
                                className="min-h-[120px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={commentForm.formState.isSubmitting}
                      >
                        {commentForm.formState.isSubmitting ? "Posting..." : "Post Comment"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to the project.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onSubmitTask)} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Submit permit application" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the task" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={taskForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsNewTaskDialogOpen(false);
                    taskForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={taskForm.formState.isSubmitting}>
                  {taskForm.formState.isSubmitting ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={isTaskDetailDialogOpen} onOpenChange={setIsTaskDetailDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>
                  <div className="flex items-start justify-between">
                    <div>{selectedTask.title}</div>
                    <Badge 
                      className={
                        selectedTask.priority === 'low' ? "bg-blue-100 text-blue-800" :
                        selectedTask.priority === 'medium' ? "bg-green-100 text-green-800" :
                        selectedTask.priority === 'high' ? "bg-yellow-100 text-yellow-800" :
                        selectedTask.priority === 'critical' ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }
                    >
                      {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)} Priority
                    </Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  {selectedTask.description && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-2">Description</h3>
                      <p className="text-sm whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Comments</h3>
                    
                    <div className="space-y-4 mb-4">
                      {/* Task comments */}
                      <div className="task-comments">
                        <UseTaskComments taskId={selectedTask.id} users={users} />
                      </div>
                    </div>
                    
                    <Form {...taskCommentForm}>
                      <form onSubmit={taskCommentForm.handleSubmit(onSubmitTaskComment)} className="space-y-4">
                        <FormField
                          control={taskCommentForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  placeholder="Add a comment..." 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          size="sm"
                          disabled={taskCommentForm.formState.isSubmitting}
                        >
                          {taskCommentForm.formState.isSubmitting ? "Posting..." : "Post Comment"}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </div>
                
                <div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Status</h3>
                      <Select 
                        defaultValue={selectedTask.status}
                        onValueChange={async (value) => {
                          updateTaskStatus.mutate({ taskId: selectedTask.id, status: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="review">In Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Assigned To</h3>
                      {selectedTask.assignedTo ? (
                        <div className="flex items-center">
                          <Avatar 
                            name={users.find((u: any) => u.id === selectedTask.assignedTo)?.name || ""}
                            color={users.find((u: any) => u.id === selectedTask.assignedTo)?.avatarColor || ""}
                            className="mr-2"
                          />
                          <span>{users.find((u: any) => u.id === selectedTask.assignedTo)?.name}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-secondary">Unassigned</p>
                      )}
                    </div>
                    
                    {selectedTask.dueDate && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Due Date</h3>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-secondary" />
                          <span>{formatDate(selectedTask.dueDate)}</span>
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Files</h3>
                      <UseTaskFiles taskId={selectedTask.id} />
                      <div className="mt-4">
                        <FileUpload taskId={selectedTask.id} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Milestone Dialog */}
      <Dialog open={isNewMilestoneDialogOpen} onOpenChange={setIsNewMilestoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Milestone</DialogTitle>
            <DialogDescription>
              Add a new milestone to track project progress.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...milestoneForm}>
            <form onSubmit={milestoneForm.handleSubmit(onSubmitMilestone)} className="space-y-4">
              <FormField
                control={milestoneForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Permit Approval" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={milestoneForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the milestone" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={milestoneForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsNewMilestoneDialogOpen(false);
                    milestoneForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={milestoneForm.formState.isSubmitting}>
                  {milestoneForm.formState.isSubmitting ? "Creating..." : "Create Milestone"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{project.name}" project and all of its tasks, files, comments, and milestones. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteProject.mutate()}
            >
              {deleteProject.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Hook to fetch and display task comments
function UseTaskComments({ taskId, users }: { taskId: number, users: any[] }) {
  const { data: comments = [], isLoading } = useQuery({ 
    queryKey: [`/api/tasks/${taskId}/comments`],
    enabled: !!taskId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-sm text-secondary text-center py-2">
        No comments yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment: any) => {
        const commenter = users.find((u: any) => u.id === comment.createdBy);
        
        return (
          <div key={comment.id} className="bg-neutral-100 p-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0 mr-3">
                {commenter ? (
                  <Avatar 
                    name={commenter.name} 
                    color={commenter.avatarColor} 
                    size="sm"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-neutral-300"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{commenter?.name || 'Unknown User'}</p>
                  <p className="text-xs text-secondary">
                    {formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                  </p>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Hook to fetch and display task files
function UseTaskFiles({ taskId }: { taskId: number }) {
  const { data: files = [], isLoading } = useQuery({ 
    queryKey: [`/api/tasks/${taskId}/files`],
    enabled: !!taskId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-sm text-secondary">
        No files attached
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file: any) => (
        <div key={file.id} className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Paperclip className="h-4 w-4 mr-2 text-secondary" />
            <a 
              href={`/api/files/${file.filename}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              {file.originalName}
            </a>
          </div>
          <div className="text-xs text-secondary">
            {(file.size / 1024).toFixed(0)} KB
          </div>
        </div>
      ))}
    </div>
  );
}
