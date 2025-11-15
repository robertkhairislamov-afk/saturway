import { useState } from 'react';
import {
  User,
  Globe,
  Shield,
  Info,
  FileText,
  ChevronRight,
  Mail,
  Lock,
  Languages,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';

export function Settings() {
  const [language, setLanguage] = useState('en');
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState('Alex');
  const [email, setEmail] = useState('alex@example.com');
  const [bio, setBio] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  return (
    <div className="space-y-6 pb-6">
      {/* Profile Section */}
      <Card className="border-[#4A9FD8]/20 bg-gradient-to-br from-card to-card/50">
        <div className="p-6">
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-[#4A9FD8]">
              <AvatarFallback className="bg-gradient-to-br from-[#4A9FD8] to-[#52C9C1] text-white">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 600 }}>{userName}</h3>
              <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
                {email}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#4A9FD8]" />
                Username
              </Label>
              <Input
                id="username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="border-[#4A9FD8]/30 focus-visible:ring-[#4A9FD8]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#4A9FD8]" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[#4A9FD8]/30 focus-visible:ring-[#4A9FD8]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#4A9FD8]" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="border-[#4A9FD8]/30 pr-10 focus-visible:ring-[#4A9FD8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#4A9FD8]" />
                About Me
              </Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="min-h-[100px] resize-none border-[#4A9FD8]/30 focus-visible:ring-[#4A9FD8]"
              />
            </div>

            <Button className="w-full bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white hover:opacity-90">
              Save Profile
            </Button>
          </div>
        </div>
      </Card>

      {/* Language Settings */}
      <Card className="border-[#4A9FD8]/20">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
              <Languages className="h-5 w-5 text-[#4A9FD8]" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Language</h3>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="border-[#4A9FD8]/30 focus:ring-[#4A9FD8]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Privacy Settings */}
      <Card className="border-[#4A9FD8]/20">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
              <Shield className="h-5 w-5 text-[#4A9FD8]" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Privacy</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500 }}>
                  Push Notifications
                </p>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  Receive updates about your tasks
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                className="data-[state=checked]:bg-[#4A9FD8]"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500 }}>Data Sharing</p>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  Help improve the app with anonymous data
                </p>
              </div>
              <Switch
                checked={dataSharing}
                onCheckedChange={setDataSharing}
                className="data-[state=checked]:bg-[#4A9FD8]"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* About & Legal */}
      <Card className="border-[#4A9FD8]/20">
        <div className="p-6 space-y-3">
          {/* About Author */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg p-3 transition-colors hover:bg-[#4A9FD8]/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
                    <Info className="h-5 w-5 text-[#4A9FD8]" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    About Author
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>About the Author</DialogTitle>
                <DialogDescription className="space-y-3 pt-4">
                  <p>
                    <strong>Saturway</strong> is crafted with dedication to help you
                    achieve mindful productivity and balanced living.
                  </p>
                  <p>
                    Our mission is to combine AI technology with thoughtful design
                    to create tools that respect your time, energy, and mental
                    well-being.
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                    Version 1.0.0 • © 2025 Saturway
                  </p>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <Separator />

          {/* Privacy Policy */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg p-3 transition-colors hover:bg-[#4A9FD8]/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
                    <Shield className="h-5 w-5 text-[#4A9FD8]" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    Privacy Policy
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Privacy Policy</DialogTitle>
                <DialogDescription className="space-y-3 pt-4 text-left">
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    Data Collection
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    We collect only the data necessary to provide you with the best
                    experience. This includes your tasks, energy tracking data, and
                    usage preferences.
                  </p>
                  
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    Data Security
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    Your data is encrypted and stored securely. We never sell or
                    share your personal information with third parties.
                  </p>
                  
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Your Rights</h4>
                  <p style={{ fontSize: '13px' }}>
                    You have the right to access, modify, or delete your data at any
                    time. Contact us for data export requests.
                  </p>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <Separator />

          {/* Terms of Service */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg p-3 transition-colors hover:bg-[#4A9FD8]/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
                    <FileText className="h-5 w-5 text-[#4A9FD8]" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    Terms of Service
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Terms of Service</DialogTitle>
                <DialogDescription className="space-y-3 pt-4 text-left">
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    Acceptance of Terms
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    By using Saturway, you agree to these terms. If you do not agree,
                    please do not use the app.
                  </p>
                  
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    License
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    We grant you a limited, non-exclusive, non-transferable license
                    to use Saturway for personal productivity purposes.
                  </p>
                  
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    Prohibited Uses
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    You may not use the app for illegal activities, to harm others,
                    or to violate any applicable laws.
                  </p>
                  
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    Changes to Terms
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    We reserve the right to modify these terms at any time. Continued
                    use constitutes acceptance of updated terms.
                  </p>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <Separator />

          {/* Copyright */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg p-3 transition-colors hover:bg-[#4A9FD8]/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
                    <Globe className="h-5 w-5 text-[#4A9FD8]" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    Copyright & Licenses
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copyright & Licenses</DialogTitle>
                <DialogDescription className="space-y-3 pt-4 text-left">
                  <p style={{ fontSize: '13px' }}>
                    © 2025 Saturway. All rights reserved.
                  </p>
                  <p style={{ fontSize: '13px' }}>
                    The Saturway name, logo, and design are trademarks of Saturway.
                    Unauthorized use is prohibited.
                  </p>
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    Open Source Libraries
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    This app uses open-source libraries licensed under MIT, Apache
                    2.0, and other permissive licenses. Full attribution can be
                    found in the app repository.
                  </p>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* App Version */}
      <div className="text-center text-muted-foreground" style={{ fontSize: '12px' }}>
        <p>Saturway v1.0.0</p>
        <p>Built with ❤️ for mindful productivity</p>
      </div>
    </div>
  );
}
