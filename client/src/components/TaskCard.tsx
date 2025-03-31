import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Avatar from "@/components/Avatar";
import { formatDistanceToNow } from "date-fns";
import { Paperclip } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type TaskCardProps = {
  task: {
    id: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    assignedTo?: number;
    projectId: number;
  };
  users: any[];
  projects: any[];
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: any) => void;
  onClick?: (task: any) => void;
};

export default function TaskCard({ task, users, projects, onDragStart, onClick }: TaskCardProps) {
  const { data: files = [] } = useQuery({ 
    queryKey: [`/api/tasks/${task.id}/files`],
    enabled: !!task.id
  });

  const assignee = users.find(user => user.id === task.assignedTo);
  const project = projects.find(project => project.id === task.projectId);

  const priorityColor = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-green-100 text-green-800",
    high: "bg-yellow-100 text-yellow-800",
    critical: "bg-red-100 text-red-800"
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const isPastDue = () => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate < new Date() && task.status !== 'completed';
  };

  return (
    <Card 
      className="task-card border-l-4 mb-2 hover:shadow-md transition-shadow"
      style={{ 
        borderLeftColor: project?.color || '#e2e8f0',
        cursor: onDragStart ? 'grab' : onClick ? 'pointer' : 'default'
      }}
      draggable={!!onDragStart}
      onDragStart={e => onDragStart && onDragStart(e, task)}
      onClick={() => onClick && onClick(task)}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <Badge className={priorityColor[task.priority as keyof typeof priorityColor] || "bg-gray-100"}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center">
            {assignee ? (
              <div className="flex items-center" title={assignee.name}>
                <Avatar 
                  name={assignee.name}
                  color={assignee.avatarColor}
                  size="sm"
                  className="mr-1"
                />
                <span className="text-xs text-gray-700">{assignee.name.split(' ')[0]}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-700">Unassigned</span>
            )}
          </div>
          
          <div className="flex items-center">
            {files.length > 0 && (
              <div className="flex items-center mr-2" title={`${files.length} attachments`}>
                <Paperclip className="h-3 w-3 text-gray-700 mr-1" />
                <span className="text-xs text-gray-700">{files.length}</span>
              </div>
            )}
            
            {task.dueDate && (
              <div className={`text-xs ${isPastDue() ? 'text-red-500 font-medium' : 'text-gray-700'}`}>
                {formatDate(task.dueDate)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
