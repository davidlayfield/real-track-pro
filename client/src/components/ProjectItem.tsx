import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

type ProjectItemProps = {
  project: {
    id: number;
    name: string;
    description?: string;
    status: string;
    color: string;
    progress: number;
    nextMilestone?: {
      title: string;
      dueDate?: string;
    };
  };
  onClick?: () => void;
};

export default function ProjectItem({ project, onClick }: ProjectItemProps) {
  const getStatusBadge = () => {
    switch (project.status) {
      case 'on_track':
        return <Badge className="bg-green-100 text-green-800">On Track</Badge>;
      case 'at_risk':
        return <Badge className="bg-yellow-100 text-yellow-800">At Risk</Badge>;
      case 'delayed':
        return <Badge className="bg-red-100 text-red-800">Delayed</Badge>;
      case 'planning':
        return <Badge className="bg-blue-100 text-blue-800">Planning</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      default:
        return <Badge>{project.status}</Badge>;
    }
  };
  
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: project.color }}
            ></div>
            <h3 className="font-medium">{project.name}</h3>
          </div>
          {getStatusBadge()}
        </div>
        
        {project.description && (
          <p className="text-sm text-secondary mb-4 line-clamp-2">{project.description}</p>
        )}
        
        <div className="mb-4">
          <div className="flex justify-between text-xs text-secondary mb-1">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-1.5" />
        </div>
        
        {project.nextMilestone && (
          <div className="text-xs">
            <span className="text-secondary">Next Milestone: </span>
            <span className="font-medium">{project.nextMilestone.title}</span>
            <span className="block text-secondary mt-0.5">
              {formatDueDate(project.nextMilestone.dueDate)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
