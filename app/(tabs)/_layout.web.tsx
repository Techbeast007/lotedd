import { Slot, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

export default function TabsLayoutWeb() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Simulate async even though localStorage is sync (for parity with native)
        const user = await Promise.resolve(localStorage.getItem('user'));

        if (!user) {
          router.replace('/role-selection');
        } else {
          setIsReady(true);
        }
      } catch (e) {
        console.error("Auth check error (web):", e);
        router.replace('/role-selection');
      }
    };

    checkUser();
  });

  if (!isReady) return null;

  return <Slot />;
}
