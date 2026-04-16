import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Building2, LayoutDashboard, LogIn, LogOut, User, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { data: adminCheck } = useIsAdmin();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container-width flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold font-display tracking-tight text-foreground">
              IndiaCorp<span className="text-primary">DB</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
              Directory
            </Link>
            <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
              Blog
            </Link>
            <Link href="/faq" className="text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </Link>
            <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">
              About
            </Link>
            <a 
              href="https://startupcaservices.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 group"
            >
              <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white text-[10px] font-black group-hover:opacity-80 transition-opacity">CA</div>
              <span className="text-primary font-semibold group-hover:text-primary/80 transition-colors">StartupCA</span>
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              {adminCheck?.isAdmin && (
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/import">
                    <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-500/20 border-0">
                      <FileSpreadsheet className="h-4 w-4" />
                      Import Excel
                    </Button>
                  </Link>
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                </div>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user?.firstName?.[0] || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {adminCheck?.isAdmin && (
                    <>
                      <DropdownMenuItem asChild className="md:hidden">
                        <Link href="/import">
                          <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                          Import Excel
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="md:hidden">
                        <Link href="/admin">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="/api/login">Log In</a>
              </Button>
              <Button size="sm" asChild className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                <a href="/api/login">
                  Get Started
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
