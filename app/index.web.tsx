import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const user = await Promise.resolve(localStorage.getItem('user')); // AsyncStorage on native

        // Delay navigation to avoid "before mounting layout" error
        requestAnimationFrame(() => {
          if (user) {
            router.replace('/(tabs)');
          } else {
            router.replace('/role-selection');
          }
        });
      } catch (error) {
        console.error("Redirect error:", error);
        requestAnimationFrame(() => {
          router.replace('/role-selection');
        });
      }
    };

    checkUserAndRedirect();
  }, []);

  return null;
}
