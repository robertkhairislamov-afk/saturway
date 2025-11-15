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
import { useTranslation } from 'react-i18next';

export function Settings() {
  const { t, i18n } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState('Alex');
  const [email, setEmail] = useState('alex@example.com');
  const [bio, setBio] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };

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
                {t('settings.profile.username')}
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
                {t('settings.profile.email')}
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
                {t('settings.profile.password')}
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
                {t('settings.profile.bio')}
              </Label>
              <Textarea
                id="bio"
                placeholder={t('settings.profile.bioPlaceholder')}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="min-h-[100px] resize-none border-[#4A9FD8]/30 focus-visible:ring-[#4A9FD8]"
              />
            </div>

            <Button className="w-full bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white hover:opacity-90">
              {t('settings.profile.save')}
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
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('settings.language.title')}</h3>
          </div>
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="border-[#4A9FD8]/30 focus:ring-[#4A9FD8]">
              <SelectValue placeholder={t('settings.language.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
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
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('settings.privacy.title')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t('settings.privacy.notifications')}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  {t('settings.privacy.notificationsDesc')}
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
                <p style={{ fontSize: '14px', fontWeight: 500 }}>{t('settings.privacy.dataSharing')}</p>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  {t('settings.privacy.dataSharingDesc')}
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
                    {t('settings.about.title')}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('settings.about.title')}</DialogTitle>
                <DialogDescription className="space-y-3 pt-4">
                  <p>{t('settings.about.description1')}</p>
                  <p>{t('settings.about.description2')}</p>
                  <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                    {t('settings.about.version')}
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
                    {t('settings.privacy.policy')}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('settings.privacy.policy')}</DialogTitle>
                <DialogDescription className="space-y-3 pt-4 text-left">
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    {t('settings.privacy.dataCollection')}
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.privacy.dataCollectionDesc')}
                  </p>

                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    {t('settings.privacy.dataSecurity')}
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.privacy.dataSecurityDesc')}
                  </p>

                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{t('settings.privacy.yourRights')}</h4>
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.privacy.yourRightsDesc')}
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
                    {t('settings.terms.title')}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('settings.terms.title')}</DialogTitle>
                <DialogDescription className="space-y-3 pt-4 text-left">
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    {t('settings.terms.acceptance')}
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.terms.acceptanceDesc')}
                  </p>

                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    {t('settings.terms.license')}
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.terms.licenseDesc')}
                  </p>

                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    {t('settings.terms.prohibited')}
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.terms.prohibitedDesc')}
                  </p>

                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    {t('settings.terms.changes')}
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.terms.changesDesc')}
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
                    {t('settings.copyright.title')}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('settings.copyright.title')}</DialogTitle>
                <DialogDescription className="space-y-3 pt-4 text-left">
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.copyright.description1')}
                  </p>
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.copyright.description2')}
                  </p>
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                    {t('settings.copyright.opensource')}
                  </h4>
                  <p style={{ fontSize: '13px' }}>
                    {t('settings.copyright.opensourceDesc')}
                  </p>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* App Version */}
      <div className="text-center text-muted-foreground" style={{ fontSize: '12px' }}>
        <p>{t('settings.version.app')}</p>
        <p>{t('settings.version.tagline')}</p>
      </div>
    </div>
  );
}
