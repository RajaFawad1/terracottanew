import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LoginEvent {
  id: string;
  timestamp: string;
  details?: string | null;
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || "Unexpected response from server");
  }
}

export default function Profile() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (member) {
      setProfileForm({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        email: member.email || "",
        phone: member.phone || "",
      });
    }
  }, [member]);

  useEffect(() => {
    if (member?.photoUrl) {
      setPhotoPreview(member.photoUrl);
    } else {
      setPhotoPreview(null);
    }
  }, [member?.photoUrl]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/profile", {
        ...profileForm,
        phone: profileForm.phone || undefined,
      });
      return parseJsonSafe(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      return parseJsonSafe(res);
    },
    onSuccess: () => {
      toast({ title: "Password updated" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to change password",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const { data: loginHistory = [], isLoading: isHistoryLoading, error: historyError } = useQuery<LoginEvent[]>({
    queryKey: ["/api/auth/login-history"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/auth/login-history");
      const parsed = await parseJsonSafe(res);
      return Array.isArray(parsed) ? parsed : [];
    },
    staleTime: 30_000,
  });

  const loginRows = useMemo(
    () =>
      loginHistory.map((event) => ({
        id: event.id,
        date: new Date(event.timestamp).toLocaleString(),
        details: event.details || "Login",
      })),
    [loginHistory]
  );

  const handleSaveProfile = () => {
    if (!profileForm.firstName || !profileForm.lastName || !profileForm.email) {
      toast({
        title: "Missing information",
        description: "First name, last name, and email are required.",
        variant: "destructive",
      });
      return;
    }
    saveProfile.mutate();
  };

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ title: "All password fields are required", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    changePassword.mutate();
  };

  const getInitials = () => {
    const name = `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || user?.username || "U";
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal" data-testid="tab-personal">Personal Info</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Login History</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Profile Photo</CardTitle>
                <CardDescription>Update your profile picture</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={photoPreview || member?.photoUrl || ""} />
                  <AvatarFallback className="text-3xl bg-primary text-primary-foreground">{getInitials()}</AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Validate file size (max 5MB)
                    const maxSize = 5 * 1024 * 1024; // 5MB
                    if (file.size > maxSize) {
                      toast({
                        title: "File too large",
                        description: "Please select an image smaller than 5MB",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Validate file type
                    if (!file.type.startsWith("image/")) {
                      toast({
                        title: "Invalid file type",
                        description: "Please select an image file",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Convert to base64
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      const base64String = event.target?.result as string;
                      if (!base64String) return;

                      // Set preview immediately
                      setPhotoPreview(base64String);
                      
                      try {
                        const res = await apiRequest("POST", "/api/profile/photo", {
                          photoUrl: base64String,
                        });
                        
                        if (res.ok) {
                          toast({ title: "Photo uploaded successfully" });
                          // Invalidate and refetch user data to get updated photoUrl
                          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                          await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
                        } else {
                          const errorData = await res.json().catch(() => ({ message: "Upload failed" }));
                          throw new Error(errorData.message || "Upload failed");
                        }
                      } catch (error: any) {
                        // Clear preview on error
                        setPhotoPreview(member?.photoUrl || null);
                        toast({
                          title: "Failed to upload photo",
                          description: error.message || "Please try again",
                          variant: "destructive",
                        });
                      }
                    };

                    reader.onerror = () => {
                      toast({
                        title: "Failed to read file",
                        description: "Please try again",
                        variant: "destructive",
                      });
                    };

                    reader.readAsDataURL(file);
                  }}
                />
                <Button 
                  variant="outline" 
                  data-testid="button-upload-photo"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                >
                  Upload Photo
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first-name" className="text-xs uppercase tracking-wide">First Name</Label>
                    <Input
                      id="first-name"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      className="mt-2"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last-name" className="text-xs uppercase tracking-wide">Last Name</Label>
                    <Input
                      id="last-name"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      className="mt-2"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs uppercase tracking-wide">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="mt-2"
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs uppercase tracking-wide">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-2"
                    data-testid="input-phone"
                  />
                </div>
                <Button onClick={handleSaveProfile} data-testid="button-save-personal" disabled={saveProfile.isPending}>
                  {saveProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password" className="text-xs uppercase tracking-wide">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className="mt-2"
                  data-testid="input-current-password"
                />
              </div>
              <div>
                <Label htmlFor="new-password" className="text-xs uppercase tracking-wide">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className="mt-2"
                  data-testid="input-new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-xs uppercase tracking-wide">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="mt-2"
                  data-testid="input-confirm-password"
                />
              </div>
              <Button onClick={handleChangePassword} data-testid="button-change-password" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Login History</CardTitle>
              <CardDescription>Recent login activity for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide">Date & Time</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isHistoryLoading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">Loading...</TableCell>
                      </TableRow>
                    ) : historyError ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-sm text-destructive">
                          Failed to load login history. Please try again later.
                        </TableCell>
                      </TableRow>
                    ) : loginRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                          No login activity yet. Login events will appear here after you log in.
                        </TableCell>
                      </TableRow>
                    ) : (
                      loginRows.map((login, index) => (
                        <TableRow key={login.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                          <TableCell className="font-mono text-sm">{login.date}</TableCell>
                          <TableCell className="text-sm">{login.details}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
