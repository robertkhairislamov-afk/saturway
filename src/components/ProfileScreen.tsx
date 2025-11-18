import { useState } from 'react';
import { User, Bell, Globe, Trash2, Languages, Edit2, Check, X, LogOut, TrendingUp, Calendar } from 'lucide-react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { RippleButton } from './RippleButton';
import { Input } from './ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { useLanguage } from './LanguageContext';
import { LanguageToggleDark } from './LanguageToggle';
import { AnimatedOceanCard } from './AnimatedOceanCard';
import { useStore } from '../store';
import { logout } from '../services/authService';

interface ProfileScreenProps {
  userName?: string;
  onNavigate?: (view: string) => void;
}

export function ProfileScreen({ userName = 'Alex', onNavigate }: ProfileScreenProps) {
  const { t, language, setLanguage } = useLanguage();
  const user = useStore((state) => state.user);
  const updateUser = useStore((state) => state.updateUser);

  const [morningReminder, setMorningReminder] = useState(true);
  const [eveningReview, setEveningReview] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const displayName = user?.firstName || userName;

  const handleEditClick = () => {
    setEditedName(displayName);
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    if (!editedName.trim()) return;

    setIsUpdating(true);
    try {
      await updateUser({ firstName: editedName.trim() });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update name:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedName('');
  };

  const handleDeleteData = () => {
    // В реальном приложении здесь будет запрос к API для удаления данных
    console.log('Delete user data');
  };

  const handleLogout = () => {
    // Очистить токен и localStorage
    logout();

    // Перезагрузить страницу для новой авторизации
    window.location.reload();
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Profile Card */}
      <AnimatedOceanCard delay={0.1}>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-[#4A9FD8]">
              <AvatarFallback className="bg-gradient-to-br from-[#4A9FD8] to-[#52C9C1] text-white" style={{ fontSize: '32px', fontWeight: 600 }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveClick()}
                    disabled={isUpdating}
                    className="border-[#4A9FD8]/30 focus-visible:ring-[#4A9FD8]"
                    placeholder={t('profile.editNamePlaceholder')}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveClick}
                      disabled={isUpdating || !editedName.trim()}
                      className="flex items-center gap-1 rounded-md bg-[#4A9FD8] px-3 py-1 text-white hover:opacity-90 disabled:opacity-50"
                      style={{ fontSize: '12px' }}
                    >
                      <Check className="h-3 w-3" />
                      {t('profile.save')}
                    </button>
                    <button
                      onClick={handleCancelClick}
                      disabled={isUpdating}
                      className="flex items-center gap-1 rounded-md bg-muted px-3 py-1 text-foreground hover:bg-muted/80 disabled:opacity-50"
                      style={{ fontSize: '12px' }}
                    >
                      <X className="h-3 w-3" />
                      {t('profile.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h3 style={{ fontSize: '24px', fontWeight: 600 }}>{displayName}</h3>
                    <button
                      onClick={handleEditClick}
                      className="rounded-md p-1 text-[#4A9FD8] hover:bg-[#4A9FD8]/10 transition-colors"
                      title={t('profile.editName')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
                    {t('profile.member')}
                  </p>
                  {user && (
                    <p className="text-muted-foreground" style={{ fontSize: '12px', marginTop: '4px' }}>
                      ID: {user.id.substring(0, 8)}... | TG: {user.telegramId}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AnimatedOceanCard>

      {/* Statistics Button */}
      {onNavigate && (
        <AnimatedOceanCard delay={0.13}>
          <button
            onClick={() => onNavigate('statistics')}
            className="w-full p-6 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-[#4A9FD8] to-[#52C9C1] p-2">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                    Статистика
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Отслеживайте свой прогресс
                  </p>
                </div>
              </div>
              <div className="text-[#4A9FD8]">→</div>
            </div>
          </button>
        </AnimatedOceanCard>
      )}

      {/* Calendar Button */}
      {onNavigate && (
        <AnimatedOceanCard delay={0.16}>
          <button
            onClick={() => onNavigate('calendar')}
            className="w-full p-6 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-2">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                    Календарь
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Просмотр задач по датам
                  </p>
                </div>
              </div>
              <div className="text-[#4A9FD8]">→</div>
            </div>
          </button>
        </AnimatedOceanCard>
      )}

      {/* Language Settings */}
      <AnimatedOceanCard delay={0.15}>
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
                <Languages className="h-5 w-5 text-[#4A9FD8]" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                {t('profile.language')}
              </h3>
            </div>
            <LanguageToggleDark currentLanguage={language} onToggle={setLanguage} />
          </div>
          <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
            {t('profile.languageDesc')}
          </p>
        </div>
      </AnimatedOceanCard>

      {/* Reminders Settings */}
      <AnimatedOceanCard delay={0.2}>
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
              <Bell className="h-5 w-5 text-[#4A9FD8]" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
              {t('profile.reminders')}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Morning Reminder */}
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t('profile.morningPlan')}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  {t('profile.morningPlanTime')}
                </p>
              </div>
              <Switch
                checked={morningReminder}
                onCheckedChange={setMorningReminder}
                className="data-[state=checked]:bg-[#4A9FD8]"
              />
            </div>

            <Separator />

            {/* Evening Review */}
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t('profile.eveningReview')}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  {t('profile.eveningReviewTime')}
                </p>
              </div>
              <Switch
                checked={eveningReview}
                onCheckedChange={setEveningReview}
                className="data-[state=checked]:bg-[#4A9FD8]"
              />
            </div>
          </div>
        </div>
      </AnimatedOceanCard>

      {/* About Section */}
      <AnimatedOceanCard delay={0.25}>
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-[#4A9FD8]/10 p-2">
              <Globe className="h-5 w-5 text-[#4A9FD8]" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
              {t('profile.about')}
            </h3>
          </div>
          <div className="space-y-2 text-muted-foreground" style={{ fontSize: '14px' }}>
            <p>{t('profile.version')}</p>
            <p>{t('profile.tagline')}</p>
          </div>
        </div>
      </AnimatedOceanCard>

      {/* Logout Section */}
      <AnimatedOceanCard delay={0.3}>
        <div className="p-6">
          <RippleButton
            variant="outline"
            className="w-full border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5" />
            {t('profile.logout')}
          </RippleButton>
        </div>
      </AnimatedOceanCard>

      {/* Delete Data Section */}
      <AnimatedOceanCard delay={0.35}>
        <div className="p-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <RippleButton
                variant="outline"
                className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="mr-2 h-5 w-5" />
                {t('profile.deleteData')}
              </RippleButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('profile.deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('profile.deleteConfirmDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteData}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {t('profile.deleteConfirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AnimatedOceanCard>
    </div>
  );
}
