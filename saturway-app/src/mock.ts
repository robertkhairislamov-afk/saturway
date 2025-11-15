// src/mock.ts
export const mockTelegramEnv = () => {
  if (typeof window !== 'undefined' && !(window as any).Telegram) {
    (window as any).Telegram = {
      WebApp: {
        initData: '',
        initDataUnsafe: {
          user: {
            id: 123456789,
            first_name: 'Тестовый',
            last_name: 'Пользователь',
            username: 'testuser'
          }
        },
        colorScheme: 'light',
        themeParams: {
          bg_color: '#ffffff',
          text_color: '#000000',
          hint_color: '#999999',
          link_color: '#7E57FF',
          button_color: '#7E57FF',
          button_text_color: '#ffffff',
          secondary_bg_color: '#f4f4f5'
        },
        ready: () => console.log('Mock: WebApp ready'),
        expand: () => console.log('Mock: WebApp expanded'),
        setHeaderColor: (color: string) => console.log('Mock: Header color', color),
        setBackgroundColor: (color: string) => console.log('Mock: BG color', color),
        MainButton: {
          setText: (text: string) => console.log('Mock: MainButton text', text),
          show: () => console.log('Mock: MainButton shown'),
          hide: () => console.log('Mock: MainButton hidden'),
          onClick: (_fn: Function) => console.log('Mock: MainButton onClick set')
        },
        HapticFeedback: {
          notificationOccurred: (type: string) => console.log('Mock: Haptic', type)
        },
        showAlert: (message: string) => alert(message),
        showConfirm: (message: string, callback: Function) => {
          const result = confirm(message);
          callback(result);
        },
        showPopup: (params: any) => alert(params.message)
      }
    };
  }
};
