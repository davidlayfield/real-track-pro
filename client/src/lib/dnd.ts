import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface TaskItem {
  id: number;
  status: string;
  order: number;
}

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

export function useDragAndDrop(projectId: number) {
  const [draggedTask, setDraggedTask] = useState<TaskItem | null>(null);

  const handleDragStart = (task: TaskItem) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    if (draggedTask.status === targetStatus) return;

    // Optimistically update the UI
    const oldStatus = draggedTask.status;
    
    // Get the tasks from the cache
    const tasksKey = `/api/projects/${projectId}/tasks`;
    const cachedTasks = queryClient.getQueryData<TaskItem[]>(tasksKey) || [];
    
    // Update the cache with the new status
    const updatedTasks = cachedTasks.map(task => 
      task.id === draggedTask.id ? { ...task, status: targetStatus } : task
    );
    
    // Update the order for tasks in the target column
    const targetColumnTasks = updatedTasks.filter(task => task.status === targetStatus);
    const newOrder = targetColumnTasks.length;
    
    // Update the specific task with new order
    const finalTasks = updatedTasks.map(task => 
      task.id === draggedTask.id ? { ...task, order: newOrder } : task
    );
    
    // Update the cache
    queryClient.setQueryData(tasksKey, finalTasks);
    
    try {
      // Update the task status on the server
      await apiRequest('PATCH', `/api/tasks/${draggedTask.id}/status`, { status: targetStatus });
      
      // Also update the order of this task
      await apiRequest('POST', '/api/tasks/reorder', [{ id: draggedTask.id, order: newOrder }]);
      
      // Invalidate the query to refetch the latest data
      queryClient.invalidateQueries({ queryKey: [tasksKey] });
    } catch (error) {
      // Revert to the original status on error
      const revertedTasks = cachedTasks.map(task => 
        task.id === draggedTask.id ? { ...task, status: oldStatus } : task
      );
      queryClient.setQueryData(tasksKey, revertedTasks);
      
      console.error('Failed to update task status', error);
    }
  };

  return {
    draggedTask,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop
  };
}
