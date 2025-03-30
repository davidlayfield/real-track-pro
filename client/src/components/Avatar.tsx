import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, color = "#2563eb", size = "md", className }: AvatarProps) {
  const initials = getInitials(name);
  
  const sizeClass = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base"
  };
  
  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center text-white font-medium", 
        sizeClass[size], 
        className
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
