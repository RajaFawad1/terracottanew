import { 
  LayoutDashboard, 
  ArrowDownUp, 
  FileText, 
  Scale, 
  Settings, 
  Users, 
  FileSearch, 
  User, 
  LogOut,
  ChevronLeft,
  TrendingUp
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { Logo } from "@/components/logo";

const financialItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: ArrowDownUp, adminOnly: true },
  { title: "Share Price", url: "/share-price", icon: TrendingUp },
  { title: "Monthly Report", url: "/reports/monthly", icon: FileText },
  { title: "Annual Report", url: "/reports/annual", icon: FileText },
  { title: "Balance Sheet", url: "/balance-sheet", icon: Scale, adminOnly: true },
  { title: "Custom Report", url: "/reports/custom", icon: FileSearch },
];

const managementItems = [
  { title: "Setup", url: "/setup", icon: Settings, adminOnly: true },
  { title: "User Management", icon: Users, adminOnly: true, hasSubMenu: true },
  { title: "Audit Trail", url: "/audit", icon: FileSearch, adminOnly: true },
];

const userManagementSubItems = [
  { title: "Add Member", url: "/users/add-member", icon: Users },
  { title: "Add Shares", url: "/users/add-shares", icon: TrendingUp },
];

const settingsItems = [
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar({ userRole = "admin" }: { userRole?: "admin" | "member" }) {
  const [location] = useLocation();
  const { user, member } = useAuth();
  const logout = useLogout();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const displayName = useMemo(() => {
    const fullName = `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
    return fullName || user?.username || "User";
  }, [member, user]);

  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [displayName]);

  return (
    <Sidebar
      className={cn(
        "border-r border-sidebar-border bg-background transition-all duration-300 ease-in-out relative",
        "max-sm:fixed max-sm:z-40 max-sm:h-screen max-sm:top-0",
        isOpen || isHovered ? "w-64 shadow-xl" : "w-20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SidebarContent className="relative z-10">
        {/* Header Section */}
        <div className={cn(
          "p-6 border-b border-sidebar-border transition-all duration-300",
          (!isOpen && !isHovered) && "p-4"
        )}>
          <div className="flex items-center gap-3">
            <Logo size={isOpen || isHovered ? "md" : "sm"} showText={isOpen || isHovered} />
          </div>
        </div>

        {/* Toggle Button */}
        <div className={cn(
          "absolute -right-3 top-20 z-20 transition-all duration-300 max-sm:hidden",
          isOpen ? "right-3" : "right-4"
        )}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "p-2 rounded-full border bg-background shadow-lg hover:shadow-xl",
              "transition-all duration-300 hover:scale-110 hover:bg-accent",
              "group border-border"
            )}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronLeft className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-300",
              !isOpen && "rotate-180",
              "group-hover:text-foreground"
            )} />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="py-4">
          {/* Financial Section */}
          <SidebarGroup>
            {(isOpen || isHovered) && (
              <SidebarGroupLabel className="text-xs uppercase tracking-wide px-4 text-muted-foreground">
                Financial
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className={cn("space-y-1", isOpen ? "px-3" : "px-2")}>
                {financialItems
                  .filter((item) => userRole === "admin" || !item.adminOnly)
                  .map((item) => {
                  const isActive = location === item.url;
                  const showContent = isOpen || isHovered;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                          className={cn(
                          "group relative transition-all duration-200 ease-in-out",
                          "hover:bg-black/10 dark:hover:bg-white/10 hover:shadow-sm hover:scale-[1.02]",
                          isActive
                            ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                            : "text-sidebar-foreground hover:text-sidebar-foreground",
                          showContent ? "rounded-md mx-2" : "rounded-full mx-auto w-12"
                        )}
                      >
                        <Link
                          href={item.url}
                          title={!showContent ? item.title : undefined}
                        >
                          <div className={cn(
                            "flex items-center w-full transition-all duration-200",
                            showContent ? "px-3 py-2" : "justify-center p-3"
                          )}>
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {showContent && (
                              <span className="ml-3 text-sm font-medium">
                                {item.title}
                              </span>
                            )}
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Management Section - Admin Only */}
          {userRole === "admin" && (
            <SidebarGroup className="mt-6">
              {(isOpen || isHovered) && (
                <SidebarGroupLabel className="text-xs uppercase tracking-wide px-4 text-muted-foreground">
                  Management
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className={cn("space-y-1", isOpen ? "px-3" : "px-2")}>
                  {managementItems.map((item) => {
                    const isActive = location === item.url || (item.hasSubMenu && userManagementSubItems.some(subItem => location === subItem.url));
                    const showContent = isOpen || isHovered;
                    const showSubMenu = item.hasSubMenu && showContent && (isActive || isHovered);

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive && !item.hasSubMenu}
                          className={cn(
                            "group relative transition-all duration-200 ease-in-out",
                            "hover:bg-black/10 dark:hover:bg-white/10 hover:shadow-sm hover:scale-[1.02]",
                            isActive && !item.hasSubMenu
                              ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                              : "text-sidebar-foreground hover:text-sidebar-foreground",
                            showContent ? "rounded-md mx-2" : "rounded-full mx-auto w-12"
                          )}
                        >
                          <Link
                            href={item.url}
                            title={!showContent ? item.title : undefined}
                          >
                            <div className={cn(
                              "flex items-center w-full transition-all duration-200",
                              showContent ? "px-3 py-2" : "justify-center p-3"
                            )}>
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              {showContent && (
                                <span className="ml-3 text-sm font-medium">
                                  {item.title}
                                </span>
                              )}
                            </div>
                          </Link>
                        </SidebarMenuButton>
                        {showSubMenu && (
                          <div className={cn("ml-4 mt-1 space-y-1", isOpen ? "px-3" : "px-2")}>
                            {userManagementSubItems.map((subItem) => {
                              const isSubActive = location === subItem.url;
                              return (
                                <SidebarMenuItem key={subItem.title}>
                                  <SidebarMenuButton
                                    asChild
                                    isActive={isSubActive}
                                    className={cn(
                                      "group relative transition-all duration-200 ease-in-out",
                                      "hover:bg-black/10 dark:hover:bg-white/10 hover:shadow-sm hover:scale-[1.02]",
                                      isSubActive
                                        ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                                        : "text-sidebar-foreground hover:text-sidebar-foreground",
                                      "rounded-md mx-2"
                                    )}
                                  >
                                    <Link href={subItem.url}>
                                      <div className="flex items-center w-full px-3 py-2">
                                        <subItem.icon className="h-3 w-3 flex-shrink-0" />
                                        <span className="ml-3 text-xs font-medium">
                                          {subItem.title}
                                        </span>
                                      </div>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </div>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Settings Section */}
          <SidebarGroup className="mt-6">
            {(isOpen || isHovered) && (
              <SidebarGroupLabel className="text-xs uppercase tracking-wide px-4 text-muted-foreground">
                Settings
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className={cn("space-y-1", isOpen ? "px-3" : "px-2")}>
                {settingsItems.map((item) => {
                  const isActive = location === item.url;
                  const showContent = isOpen || isHovered;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                          className={cn(
                          "group relative transition-all duration-200 ease-in-out",
                          "hover:bg-black/10 dark:hover:bg-white/10 hover:shadow-sm hover:scale-[1.02]",
                          isActive
                            ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                            : "text-sidebar-foreground hover:text-sidebar-foreground",
                          showContent ? "rounded-md mx-2" : "rounded-full mx-auto w-12"
                        )}
                      >
                        <Link
                          href={item.url}
                          title={!showContent ? item.title : undefined}
                        >
                          <div className={cn(
                            "flex items-center w-full transition-all duration-200",
                            showContent ? "px-3 py-2" : "justify-center p-3"
                          )}>
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {showContent && (
                              <span className="ml-3 text-sm font-medium">
                                {item.title}
                              </span>
                            )}
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* User Profile Section */}
        <div className={cn(
          "p-4 border-t border-sidebar-border",
          (!isOpen && !isHovered) && "p-2"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 transition-all duration-200",
                  (isOpen || isHovered) ? "px-2" : "justify-center p-2"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member?.photoUrl || ""} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials || "U"}</AvatarFallback>
                </Avatar>
                {(isOpen || isHovered) && (
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role || userRole}</p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => logout.mutate()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
