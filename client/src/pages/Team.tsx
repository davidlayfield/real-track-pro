import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Avatar from "@/components/Avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Mail, Phone, Users } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { formatDistance } from "date-fns";

type UserType = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  avatarColor: string;
  createdAt: string;
};

export default function Team() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  const { data: users = [], isLoading } = useQuery({ 
    queryKey: ['/api/users']
  });

  // Filter users based on search term
  const filteredUsers = users.filter((user: UserType) => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Group users by role
  const admins = filteredUsers.filter((user: UserType) => user.role === 'admin');
  const managers = filteredUsers.filter((user: UserType) => user.role === 'manager');
  const members = filteredUsers.filter((user: UserType) => user.role === 'member');

  // Function to copy email to clipboard
  const copyEmailToClipboard = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Email copied",
      description: `${email} copied to clipboard`,
    });
  };

  // Table columns
  const columns: ColumnDef<UserType>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2">
            <Avatar name={user.name} color={user.avatarColor} />
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">@{user.username}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center">
          <span className="mr-2">{row.original.email}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 rounded-full"
            onClick={() => copyEmailToClipboard(row.original.email)}
          >
            <Mail className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <Badge
            className={
              role === 'admin' ? "bg-purple-100 text-purple-800" :
              role === 'manager' ? "bg-blue-100 text-blue-800" :
              "bg-green-100 text-green-800"
            }
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return formatDistance(date, new Date(), { addSuffix: true });
      },
    },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Team Members</h1>
          <p className="text-sm text-secondary mt-1">View all team members and their roles</p>
        </div>
        
        <div className="mt-4 md:mt-0 relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredUsers.length > 0 ? (
        <>
          {/* Table view for larger screens */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={filteredUsers}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Card view for smaller screens */}
          <div className="md:hidden space-y-6">
            {/* Admins */}
            {admins.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-3 flex items-center">
                  <Badge className="bg-purple-100 text-purple-800 mr-2">Admin</Badge>
                  Team Administrators
                </h2>
                <div className="space-y-3">
                  {admins.map((user: UserType) => (
                    <UserCard key={user.id} user={user} onCopyEmail={copyEmailToClipboard} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Managers */}
            {managers.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-3 flex items-center">
                  <Badge className="bg-blue-100 text-blue-800 mr-2">Manager</Badge>
                  Project Managers
                </h2>
                <div className="space-y-3">
                  {managers.map((user: UserType) => (
                    <UserCard key={user.id} user={user} onCopyEmail={copyEmailToClipboard} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Team Members */}
            {members.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-3 flex items-center">
                  <Badge className="bg-green-100 text-green-800 mr-2">Member</Badge>
                  Team Members
                </h2>
                <div className="space-y-3">
                  {members.map((user: UserType) => (
                    <UserCard key={user.id} user={user} onCopyEmail={copyEmailToClipboard} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-neutral-400 mb-4" />
            <h3 className="text-lg font-medium text-center">No Team Members Found</h3>
            <p className="text-sm text-secondary text-center mt-1 mb-4 max-w-md">
              {searchTerm 
                ? `No team members match "${searchTerm}". Try a different search term.`
                : "There are no team members in the system yet."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// User Card Component for mobile view
function UserCard({ user, onCopyEmail }: { user: UserType, onCopyEmail: (email: string) => void }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center">
          <Avatar name={user.name} color={user.avatarColor} size="md" className="mr-3" />
          <div>
            <h3 className="font-medium">{user.name}</h3>
            <p className="text-sm text-secondary">@{user.username}</p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="h-4 w-4 text-secondary mr-2" />
              <span className="text-sm">{user.email}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => onCopyEmail(user.email)}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
