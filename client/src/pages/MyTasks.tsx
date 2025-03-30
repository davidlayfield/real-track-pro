import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { format, isToday, isPast, isTomorrow, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TaskCard from "@/components/TaskCard";
import { ClipboardList, Filter } from "lucide-react";

export default function MyTasks() {
  const { user } = useAuth();
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  const { data: tasks = [], isLoading } = useQuery({ 
    queryKey: ['/api/tasks/assigned'],
    enabled: !!user
  });
  
  const { data: projects = [] } = useQuery({ 
    queryKey: ['/api/projects']
  });
  
  const { data: users = [] } = useQuery({ 
    queryKey: ['/api/users']
  });

  // Filter tasks by priority if filter is set
  const filteredTasks = priorityFilter === "all" 
    ? tasks 
    : tasks.filter((task: any) => task.priority === priorityFilter);

  // Group tasks by status
  const tasksByStatus = {
    todo: filteredTasks.filter((task: any) => task.status === 'todo'),
    in_progress: filteredTasks.filter((task: any) => task.status === 'in_progress'),
    review: filteredTasks.filter((task: any) => task.status === 'review'),
    completed: filteredTasks.filter((task: any) => task.status === 'completed'),
  };

  // Group tasks by due date
  const today = new Date();
  const tomorrow = addDays(today, 1);

  const tasksByDueDate = {
    overdue: filteredTasks.filter((task: any) => 
      task.status !== 'completed' && 
      task.dueDate && 
      isPast(new Date(task.dueDate)) && 
      !isToday(new Date(task.dueDate))
    ),
    today: filteredTasks.filter((task: any) => 
      task.dueDate && 
      isToday(new Date(task.dueDate))
    ),
    tomorrow: filteredTasks.filter((task: any) => 
      task.dueDate && 
      isTomorrow(new Date(task.dueDate))
    ),
    upcoming: filteredTasks.filter((task: any) => 
      task.dueDate && 
      new Date(task.dueDate) > tomorrow && 
      !isTomorrow(new Date(task.dueDate))
    ),
    noDueDate: filteredTasks.filter((task: any) => !task.dueDate),
  };

  const handleTaskClick = (task: any) => {
    window.location.href = `/projects/${task.projectId}?task=${task.id}`;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">My Tasks</h1>
          <p className="text-sm text-secondary mt-1">Manage and track your assigned tasks</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center">
          <div className="flex items-center">
            <Filter className="h-4 w-4 mr-2 text-secondary" />
            <span className="text-sm mr-2">Priority:</span>
            <Select
              value={priorityFilter}
              onValueChange={setPriorityFilter}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="by-status" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="by-status">By Status</TabsTrigger>
          <TabsTrigger value="by-due-date">By Due Date</TabsTrigger>
        </TabsList>
        
        {/* Tasks by Status */}
        <TabsContent value="by-status">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* To Do Column */}
            <Card>
              <div className="bg-neutral-100 p-3 rounded-t-lg flex items-center justify-between">
                <h3 className="font-medium text-sm">To Do</h3>
                <Badge variant="outline">{tasksByStatus.todo.length}</Badge>
              </div>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByStatus.todo.length > 0 ? (
                  <div className="space-y-2">
                    {tasksByStatus.todo.map((task: any) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        users={users} 
                        projects={projects}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-secondary">
                    No tasks to do
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* In Progress Column */}
            <Card>
              <div className="bg-neutral-100 p-3 rounded-t-lg flex items-center justify-between">
                <h3 className="font-medium text-sm">In Progress</h3>
                <Badge variant="outline">{tasksByStatus.in_progress.length}</Badge>
              </div>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByStatus.in_progress.length > 0 ? (
                  <div className="space-y-2">
                    {tasksByStatus.in_progress.map((task: any) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        users={users} 
                        projects={projects}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-secondary">
                    No tasks in progress
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Review Column */}
            <Card>
              <div className="bg-neutral-100 p-3 rounded-t-lg flex items-center justify-between">
                <h3 className="font-medium text-sm">In Review</h3>
                <Badge variant="outline">{tasksByStatus.review.length}</Badge>
              </div>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByStatus.review.length > 0 ? (
                  <div className="space-y-2">
                    {tasksByStatus.review.map((task: any) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        users={users} 
                        projects={projects}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-secondary">
                    No tasks in review
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Completed Column */}
            <Card>
              <div className="bg-neutral-100 p-3 rounded-t-lg flex items-center justify-between">
                <h3 className="font-medium text-sm">Completed</h3>
                <Badge variant="outline">{tasksByStatus.completed.length}</Badge>
              </div>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByStatus.completed.length > 0 ? (
                  <div className="space-y-2">
                    {tasksByStatus.completed.map((task: any) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        users={users} 
                        projects={projects}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-secondary">
                    No completed tasks
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tasks by Due Date */}
        <TabsContent value="by-due-date">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Overdue Tasks */}
            <Card className="lg:col-span-3">
              <div className="bg-red-50 p-3 rounded-t-lg flex items-center justify-between">
                <h3 className="font-medium text-red-800 text-sm">Overdue</h3>
                <Badge variant="outline" className="text-red-800 bg-red-50">
                  {tasksByDueDate.overdue.length}
                </Badge>
              </div>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByDueDate.overdue.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasksByDueDate.overdue.map((task: any) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        users={users} 
                        projects={projects}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-secondary">
                    No overdue tasks
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Today's Tasks */}
            <Card>
              <div className="bg-amber-50 p-3 rounded-t-lg flex items-center justify-between">
                <h3 className="font-medium text-amber-800 text-sm">Today</h3>
                <Badge variant="outline" className="text-amber-800 bg-amber-50">
                  {tasksByDueDate.today.length}
                </Badge>
              </div>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByDueDate.today.length > 0 ? (
                  <div className="space-y-2">
                    {tasksByDueDate.today.map((task: any) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        users={users} 
                        projects={projects}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-secondary">
                    No tasks due today
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Tomorrow's Tasks */}
            <Card>
              <div className="bg-blue-50 p-3 rounded-t-lg flex items-center justify-between">
                <h3 className="font-medium text-blue-800 text-sm">Tomorrow</h3>
                <Badge variant="outline" className="text-blue-800 bg-blue-50">
                  {tasksByDueDate.tomorrow.length}
                </Badge>
              </div>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByDueDate.tomorrow.length > 0 ? (
                  <div className="space-y-2">
                    {tasksByDueDate.tomorrow.map((task: any) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        users={users} 
                        projects={projects}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-secondary">
                    No tasks due tomorrow
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Upcoming Tasks */}
            <Card>
              <div className="bg-neutral-100 p-3 rounded-t-lg flex items-center justify-between">
                <h3 className="font-medium text-sm">Upcoming</h3>
                <Badge variant="outline">
                  {tasksByDueDate.upcoming.length}
                </Badge>
              </div>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tasksByDueDate.upcoming.length > 0 ? (
                  <div className="space-y-2">
                    {tasksByDueDate.upcoming.map((task: any) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        users={users} 
                        projects={projects}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-secondary">
                    No upcoming tasks
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Tasks with No Due Date */}
          <Card className="mt-6">
            <div className="bg-neutral-100 p-3 rounded-t-lg flex items-center justify-between">
              <h3 className="font-medium text-sm">No Due Date</h3>
              <Badge variant="outline">
                {tasksByDueDate.noDueDate.length}
              </Badge>
            </div>
            <CardContent className="p-3">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : tasksByDueDate.noDueDate.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tasksByDueDate.noDueDate.map((task: any) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      users={users} 
                      projects={projects}
                      onClick={() => handleTaskClick(task)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-secondary">
                  No tasks without due dates
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {tasks.length === 0 && !isLoading && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-neutral-400 mb-4" />
            <h3 className="text-lg font-medium text-center">No Tasks Assigned</h3>
            <p className="text-sm text-secondary text-center mt-1 mb-6 max-w-md">
              You don't have any tasks assigned to you yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
