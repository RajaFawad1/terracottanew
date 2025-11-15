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

const loginHistory = [
  { id: "1", date: "2024-01-15 10:30 AM", device: "Chrome on Windows", location: "New York, NY" },
  { id: "2", date: "2024-01-14 3:45 PM", device: "Safari on iPhone", location: "New York, NY" },
  { id: "3", date: "2024-01-13 9:15 AM", device: "Chrome on Windows", location: "New York, NY" },
  { id: "4", date: "2024-01-10 11:20 AM", device: "Firefox on Mac", location: "Boston, MA" },
];

export default function Profile() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Profile</h1>
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
                  <AvatarImage src="" />
                  <AvatarFallback className="text-3xl bg-primary text-primary-foreground">JD</AvatarFallback>
                </Avatar>
                <Button variant="outline" data-testid="button-upload-photo">Upload Photo</Button>
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
                    <Input id="first-name" defaultValue="John" className="mt-2" data-testid="input-first-name" />
                  </div>
                  <div>
                    <Label htmlFor="last-name" className="text-xs uppercase tracking-wide">Last Name</Label>
                    <Input id="last-name" defaultValue="Doe" className="mt-2" data-testid="input-last-name" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs uppercase tracking-wide">Email</Label>
                  <Input id="email" type="email" defaultValue="john@terracotta.com" className="mt-2" data-testid="input-email" />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs uppercase tracking-wide">Phone</Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" className="mt-2" data-testid="input-phone" />
                </div>
                <Button data-testid="button-save-personal">Save Changes</Button>
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
                <Input id="current-password" type="password" className="mt-2" data-testid="input-current-password" />
              </div>
              <div>
                <Label htmlFor="new-password" className="text-xs uppercase tracking-wide">New Password</Label>
                <Input id="new-password" type="password" className="mt-2" data-testid="input-new-password" />
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-xs uppercase tracking-wide">Confirm New Password</Label>
                <Input id="confirm-password" type="password" className="mt-2" data-testid="input-confirm-password" />
              </div>
              <Button data-testid="button-change-password">Change Password</Button>
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
                      <TableHead className="text-xs uppercase tracking-wide">Device</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistory.map((login, index) => (
                      <TableRow key={login.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-mono text-sm">{login.date}</TableCell>
                        <TableCell className="text-sm">{login.device}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{login.location}</TableCell>
                      </TableRow>
                    ))}
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
