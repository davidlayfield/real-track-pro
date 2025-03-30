import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Inbox,
  Plus
} from "lucide-react";

type SidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
};

function NavItem({ href, icon, children, isActive }: NavItemProps) {
  return (
    <Link href={href}>
      <a className={cn(
        "flex items-center px-3 py-2 rounded-md text-sm font-medium",
        isActive 
          ? "bg-primary/10 text-primary border-l-4 border-primary" 
          : "text-secondary hover:bg-neutral-200"
      )}>
        {icon}
        <span className="ml-3">{children}</span>
      </a>
    </Link>
  );
}

type ProjectNavItemProps = {
  id: number;
  name: string;
  color: string;
  isActive?: boolean;
};

function ProjectNavItem({ id, name, color, isActive }: ProjectNavItemProps) {
  return (
    <Link href={`/projects/${id}`}>
      <a className={cn(
        "flex items-center px-3 py-2 rounded-md text-sm font-medium",
        isActive 
          ? "bg-primary/10 text-primary border-l-4 border-primary" 
          : "text-secondary hover:bg-neutral-200"
      )}>
        <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: color }}></div>
        <span>{name}</span>
      </a>
    </Link>
  );
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { isManager } = useAuth();
  const { data: projects = [] } = useQuery({ 
    queryKey: ['/api/projects'],
  });

  // For mobile: close sidebar when location changes
  useEffect(() => {
    if (open) {
      setOpen(false);
    }
  }, [location]);

  const content = (
    <div className="py-4 h-full flex flex-col">
      <nav className="flex-1">
        <ul className="space-y-1 px-2">
          <li>
            <NavItem 
              href="/" 
              icon={<LayoutDashboard className="h-4 w-4" />}
              isActive={location === "/"}
            >
              Dashboard
            </NavItem>
          </li>
          <li>
            <NavItem 
              href="/projects" 
              icon={<FolderKanban className="h-4 w-4" />}
              isActive={location === "/projects" || location.startsWith("/projects/")}
            >
              Projects
            </NavItem>
          </li>
          <li>
            <NavItem 
              href="/tasks" 
              icon={<CheckSquare className="h-4 w-4" />}
              isActive={location === "/tasks"}
            >
              My Tasks
            </NavItem>
          </li>
          <li>
            <NavItem 
              href="/team" 
              icon={<Users className="h-4 w-4" />}
              isActive={location === "/team"}
            >
              Team
            </NavItem>
          </li>
        </ul>
        
        <div className="mt-8 px-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Projects</h3>
            {isManager() && (
              <Link href="/projects?new=true">
                <a className="text-primary hover:text-primary/80">
                  <Plus className="h-4 w-4" />
                </a>
              </Link>
            )}
          </div>
          <ul className="space-y-1">
            {projects.map((project: any) => (
              <li key={project.id}>
                <ProjectNavItem
                  id={project.id}
                  name={project.name}
                  color={project.color}
                  isActive={location === `/projects/${project.id}`}
                />
              </li>
            ))}

            {projects.length === 0 && (
              <li className="px-3 py-2 text-sm text-secondary">
                No projects yet
              </li>
            )}
          </ul>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-56 bg-white border-r border-neutral-300 flex-shrink-0 overflow-y-auto h-full hidden lg:block">
        {content}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64" overlayClassName="backdrop-blur-sm">
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}
