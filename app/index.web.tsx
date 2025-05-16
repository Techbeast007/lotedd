import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      router.replace('/(tabs)'); // Or your default tab
    } else {
      router.replace('/role-selection'); // Not (auth)!
    }
  });

  return null;
}
