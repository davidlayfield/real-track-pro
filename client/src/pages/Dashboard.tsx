import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import StatCard from "@/components/StatCard";
import ProjectItem from "@/components/ProjectItem";
import ActivityItem from "@/components/ActivityItem";
import TaskCard from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { Filter, Plus } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistance } from "date-fns";

export default function Dashboard() {
  const { isManager } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const { data: projects = [] } = useQuery({ 
    queryKey: ['/api/projects']
  });
  
  const { data: activities = [] } = useQuery({ 
    queryKey: ['/api/activities/recent']
  });
  
  const { data: tasks = [] } = useQuery({ 
    queryKey: ['/api/tasks/assigned']
  });
  
  const { data: users = [] } = useQuery({ 
    queryKey: ['/api/users']
  });

  // Statistics
  const activeProjects = projects.length;
  const tasksInProgress = tasks.filter((task: any) => task.status === 'in_progress').length;
  const completedMilestones = projects.reduce((acc: number, project: any) => {
    const completedMilestones = project.nextMilestone?.completed ? 1 : 0;
    return acc + completedMilestones;
  }, 0);
  
  const nextDeadline = tasks
    .filter((task: any) => task.dueDate && task.status !== 'completed')
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  
  const daysToNextDeadline = nextDeadline 
    ? Math.ceil((new Date(nextDeadline.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Filtered projects based on status
  const filteredProjects = statusFilter.length === 0 
    ? projects 
    : projects.filter((project: any) => statusFilter.includes(project.status));

  return (
    <div>
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-sm text-secondary mt-1">Overview of your housing development projects</p>
        </div>
        <div className="mt-4 md:mt-0 flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="mr-2">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Project Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('planning')}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setStatusFilter([...statusFilter, 'planning']);
                  } else {
                    setStatusFilter(statusFilter.filter(s => s !== 'planning'));
                  }
                }}
              >
                Planning
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('on_track')}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setStatusFilter([...statusFilter, 'on_track']);
                  } else {
                    setStatusFilter(statusFilter.filter(s => s !== 'on_track'));
                  }
                }}
              >
                On Track
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('at_risk')}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setStatusFilter([...statusFilter, 'at_risk']);
                  } else {
                    setStatusFilter(statusFilter.filter(s => s !== 'at_risk'));
                  }
                }}
              >
                At Risk
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('delayed')}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setStatusFilter([...statusFilter, 'delayed']);
                  } else {
                    setStatusFilter(statusFilter.filter(s => s !== 'delayed'));
                  }
                }}
              >
                Delayed
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('completed')}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setStatusFilter([...statusFilter, 'completed']);
                  } else {
                    setStatusFilter(statusFilter.filter(s => s !== 'completed'));
                  }
                }}
              >
                Completed
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {isManager() && (
            <Button asChild>
              <Link href="/projects?new=true">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Active Projects" 
          value={activeProjects}
          change={{ type: 'increase', text: 'Up from 3 last month' }}
        />
        
        <StatCard 
          title="Tasks in Progress" 
          value={tasksInProgress}
          change={{ type: 'decrease', text: 'Down from 32 last week' }}
        />
        
        <StatCard 
          title="Completed Milestones" 
          value={completedMilestones}
          change={{ type: 'increase', text: 'Up from 8 last month' }}
        />
        
        <StatCard 
          title="Days to Next Deadline" 
          value={daysToNextDeadline ?? "N/A"}
          alert={daysToNextDeadline ? `${nextDeadline.title}` : undefined}
        />
      </div>

      {/* Project Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-300 mb-6">
        <div className="p-4 border-b border-neutral-300">
          <h2 className="text-lg font-medium">Project Progress</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-neutral-200">
              <TableRow>
                <TableHead className="text-left text-xs font-medium text-secondary uppercase tracking-wider">Project Name</TableHead>
                <TableHead className="text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-left text-xs font-medium text-secondary uppercase tracking-wider">Progress</TableHead>
                <TableHead className="text-left text-xs font-medium text-secondary uppercase tracking-wider">Next Milestone</TableHead>
                <TableHead className="text-left text-xs font-medium text-secondary uppercase tracking-wider">Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project: any) => (
                <TableRow key={project.id} className="hover:bg-neutral-100">
                  <TableCell>
                    <Link href={`/projects/${project.id}`}>
                      <div className="flex items-center cursor-pointer">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: project.color }}></div>
                        <div className="text-sm font-medium text-gray-900">{project.name}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {project.status === 'on_track' && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">On Track</span>
                    )}
                    {project.status === 'at_risk' && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">At Risk</span>
                    )}
                    {project.status === 'planning' && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Planning</span>
                    )}
                    {project.status === 'delayed' && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Delayed</span>
                    )}
                    {project.status === 'completed' && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Completed</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="w-full bg-neutral-300 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          project.status === 'on_track' ? 'bg-success' :
                          project.status === 'at_risk' ? 'bg-warning' :
                          project.status === 'delayed' ? 'bg-error' :
                          project.status === 'planning' ? 'bg-primary' :
                          'bg-neutral-500'
                        }`} 
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-secondary mt-1">{project.progress}%</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-800">
                    {project.nextMilestone?.title || 'No milestone'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-800">
                    {project.nextMilestone?.dueDate 
                      ? new Date(project.nextMilestone.dueDate).toLocaleDateString() 
                      : 'No due date'
                    }
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-sm text-gray-500">
                    No projects match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Recent Activities and Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-300">
          <div className="p-4 border-b border-neutral-300 flex justify-between items-center">
            <h2 className="text-lg font-medium">Recent Activity</h2>
            <Link href="/activities">
              <Button variant="link" className="h-auto p-0">View All</Button>
            </Link>
          </div>
          <div className="p-2">
            {activities.slice(0, 4).map((activity: any) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                user={users.find((u: any) => u.id === activity.userId)}
              />
            ))}
            
            {activities.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">
                No recent activities.
              </div>
            )}
          </div>
        </div>
        
        {/* Upcoming Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-300">
          <div className="p-4 border-b border-neutral-300 flex justify-between items-center">
            <h2 className="text-lg font-medium">Upcoming Tasks</h2>
            <Link href="/tasks">
              <Button variant="link" className="h-auto p-0">View All</Button>
            </Link>
          </div>
          <div className="p-2">
            {tasks
              .filter((task: any) => task.status !== 'completed')
              .sort((a: any, b: any) => {
                // Sort by priority first, then by due date
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 4;
                const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 4;
                
                if (aPriority !== bPriority) return aPriority - bPriority;
                
                // If same priority, sort by due date
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
              })
              .slice(0, 4)
              .map((task: any) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  users={users} 
                  projects={projects}
                  onClick={() => window.location.href = `/projects/${task.projectId}?task=${task.id}`}
                />
              ))
            }
            
            {tasks.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">
                No upcoming tasks.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
