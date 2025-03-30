import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import MyTasks from "@/pages/MyTasks";
import Team from "@/pages/Team";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    const publicRoutes = ['/login', '/register'];
    if (!publicRoutes.includes(location)) {
      window.location.href = '/login';
      return null;
    }
    return <>{children}</>;
  }

  return (
    <div className="bg-neutral-100 min-h-screen flex flex-col overflow-hidden">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">
        {() => (
          <AppLayout>
            <Dashboard />
          </AppLayout>
        )}
      </Route>
      <Route path="/projects">
        {() => (
          <AppLayout>
            <Projects />
          </AppLayout>
        )}
      </Route>
      <Route path="/projects/:id">
        {(params) => (
          <AppLayout>
            <ProjectDetail id={Number(params.id)} />
          </AppLayout>
        )}
      </Route>
      <Route path="/tasks">
        {() => (
          <AppLayout>
            <MyTasks />
          </AppLayout>
        )}
      </Route>
      <Route path="/team">
        {() => (
          <AppLayout>
            <Team />
          </AppLayout>
        )}
      </Route>
      <Route>
        {() => (
          <AppLayout>
            <NotFound />
          </AppLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
