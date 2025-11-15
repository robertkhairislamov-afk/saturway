import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ru' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-[#7E57FF]/20 to-[#4ECDC4]/20 px-4 transition-all hover:from-[#7E57FF]/30 hover:to-[#4ECDC4]/30"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4 text-[#7E57FF]" />
      <span className="text-sm font-medium text-foreground">
        {i18n.language === 'en' ? 'EN' : 'RU'}
      </span>
    </button>
  );
}
