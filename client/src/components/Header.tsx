import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Avatar from "@/components/Avatar";
import { Bell, Menu, Search, LogOut, User, Settings } from "lucide-react";

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [location] = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-white border-b border-neutral-300 flex justify-between items-center px-4 py-2 h-14 sticky top-0 z-10">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-2 lg:hidden" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="text-secondary h-5 w-5" />
        </Button>
        <Link href="/">
          <h1 className="text-xl font-semibold text-accent cursor-pointer">SimpliTask</h1>
        </Link>
      </div>
      
      <div className="flex items-center space-x-4">
        {searchOpen ? (
          <div className="relative md:block">
            <Input 
              type="text" 
              placeholder="Search..." 
              className="pl-8 pr-4 py-1 rounded-md border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
            <Search className="absolute left-2 top-2 text-secondary h-4 w-4" />
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setSearchOpen(true)}>
            <Search className="text-secondary h-5 w-5" />
          </Button>
        )}
        
        <Button variant="ghost" size="icon">
          <Bell className="text-secondary h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar 
                name={user?.name || "User"} 
                color={user?.avatarColor || "#2563eb"} 
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
