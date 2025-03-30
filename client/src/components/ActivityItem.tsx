import Avatar from "@/components/Avatar";
import { formatDistanceToNow } from "date-fns";

type ActivityItemProps = {
  activity: {
    id: number;
    type: string;
    entityType: string;
    entityId: number;
    description: string;
    userId: number;
    createdAt: string;
  };
  user: {
    id: number;
    name: string;
    avatarColor: string;
  } | undefined;
};

export default function ActivityItem({ activity, user }: ActivityItemProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create':
        return 'add_circle';
      case 'update':
        return 'edit';
      case 'delete':
        return 'delete';
      case 'comment':
        return 'chat';
      case 'complete':
        return 'check_circle';
      case 'upload':
        return 'file_upload';
      default:
        return 'info';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <div className="flex p-2 hover:bg-neutral-100 rounded-md">
      <div className="flex-shrink-0 mr-3">
        {user ? (
          <Avatar 
            name={user.name} 
            color={user.avatarColor} 
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-neutral-300 flex items-center justify-center">
            <span className="material-icons text-sm text-secondary">person</span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm">
          <span className="font-medium">{user?.name || 'Unknown User'}</span> 
          <span className="text-secondary"> {activity.description}</span>
          {activity.entityType === 'task' && (
            <span className="font-medium"> {activity.entityType}</span>
          )}
          {activity.entityType === 'project' && (
            <span className="font-medium"> {activity.entityType}</span>
          )}
        </p>
        <p className="text-xs text-secondary mt-1">
          {formatTimeAgo(activity.createdAt)}
        </p>
      </div>
    </div>
  );
}
