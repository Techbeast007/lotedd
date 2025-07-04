'use client';

import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  priceAlerts: boolean;
  newArrivals: boolean;
  stockAlerts: boolean;
  recommendations: boolean;
  chat: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Default notification settings
  const defaultSettings = React.useMemo(() => ({
    orderUpdates: true,
    promotions: true,
    priceAlerts: true,
    newArrivals: false,
    stockAlerts: true,
    recommendations: false,
    chat: true,
    email: true,
    push: true,
    sms: false,
  }), []);
  
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  // Fetch user settings on component mount
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        setIsLoading(true);
        
        const user = await AsyncStorage.getItem('user');
        if (!user) {
          Alert.alert(
            'Not Logged In',
            'Please log in to manage your notification settings.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
        
        const parsedUser = JSON.parse(user);
        setUserId(parsedUser.uid);
        
        // Fetch user notification settings
        const settingsDoc = await firestore()
          .collection('users')
          .doc(parsedUser.uid)
          .collection('settings')
          .doc('notifications')
          .get();
        
        // Check if document exists and has data
        if (settingsDoc.exists && typeof settingsDoc.data === 'function') {
          const data = settingsDoc.data() || {};
          // Create validated settings object with proper boolean values
          const validatedSettings: NotificationSettings = {
            orderUpdates: Boolean(data.orderUpdates),
            promotions: Boolean(data.promotions),
            priceAlerts: Boolean(data.priceAlerts),
            newArrivals: Boolean(data.newArrivals),
            stockAlerts: Boolean(data.stockAlerts),
            recommendations: Boolean(data.recommendations),
            chat: Boolean(data.chat),
            email: Boolean(data.email),
            push: Boolean(data.push),
            sms: Boolean(data.sms),
          };
          setSettings(validatedSettings);
        } else {
          // If no settings exist, create default settings
          await firestore()
            .collection('users')
            .doc(parsedUser.uid)
            .collection('settings')
            .doc('notifications')
            .set(defaultSettings);
        }
      } catch (error) {
        console.error('Error fetching notification settings:', error);
        Alert.alert('Error', 'Failed to load notification settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserSettings();
  }, [router, defaultSettings]);

  const handleToggleSetting = async (setting: keyof NotificationSettings) => {
    try {
      if (!userId) {
        Alert.alert('Error', 'You need to be logged in to change settings.');
        return;
      }
      
      // Ensure we're working with boolean values
      const currentValue = Boolean(settings[setting]);
      
      // Create a new settings object with the updated value
      const newSettings = {
        ...settings,
        [setting]: !currentValue,
      };
      
      // Update local state immediately for responsive UI
      setSettings(newSettings);
      
      // Show saving indicator
      setIsSaving(true);
      
      // Update settings in Firestore
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('notifications')
        .set(newSettings);
        
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
      
      // Revert the change in UI if save fails
      setSettings(settings);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle setting switch component
  const SettingToggle = ({ 
    title, 
    description, 
    setting,
  }: { 
    title: string; 
    description?: string; 
    setting: keyof NotificationSettings;
  }) => (
    <HStack style={styles.settingItem}>
      <VStack style={{ flex: 1 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </VStack>
      <Switch
        size="sm"
        value={Boolean(settings?.[setting])}
        onToggle={() => handleToggleSetting(setting)}
        trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
        disabled={isLoading || isSaving}
      />
    </HStack>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Heading style={styles.headerTitle}>Notification Settings</Heading>
        {(isLoading || isSaving) ? (
          <View style={styles.placeholder}>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      
      <Box style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Notification Types */}
          <View style={styles.section}>
            <Heading size="sm" style={styles.sectionTitle}>Notification Types</Heading>
            <View style={styles.card}>
              <SettingToggle 
                title="Order Updates" 
                description="Updates about your order status and deliveries"
                setting="orderUpdates" 
              />
              <Divider style={styles.divider} />
              
              <SettingToggle 
                title="Promotions & Offers" 
                description="Special offers, discounts, and promotions"
                setting="promotions" 
              />
              <Divider style={styles.divider} />
              
              <SettingToggle 
                title="Price Alerts" 
                description="Notifications when saved items go on sale"
                setting="priceAlerts" 
              />
              <Divider style={styles.divider} />
              
              <SettingToggle 
                title="New Arrivals" 
                description="Updates about new products in categories you follow"
                setting="newArrivals" 
              />
              <Divider style={styles.divider} />
              
              <SettingToggle 
                title="Stock Alerts" 
                description="Notifications when out-of-stock items become available"
                setting="stockAlerts" 
              />
              <Divider style={styles.divider} />
              
              <SettingToggle 
                title="Recommendations" 
                description="Product suggestions based on your interests"
                setting="recommendations" 
              />
              <Divider style={styles.divider} />
              
              <SettingToggle 
                title="Chat Messages" 
                description="Messages from suppliers and customer support"
                setting="chat" 
              />
            </View>
          </View>
          
          {/* Notification Channels */}
          <View style={styles.section}>
            <Heading size="sm" style={styles.sectionTitle}>Notification Channels</Heading>
            <View style={styles.card}>
              <SettingToggle 
                title="Email Notifications" 
                description="Receive notifications via email"
                setting="email" 
              />
              <Divider style={styles.divider} />
              
              <SettingToggle 
                title="Push Notifications" 
                description="Receive notifications on your device"
                setting="push" 
              />
              <Divider style={styles.divider} />
              
              <SettingToggle 
                title="SMS Notifications" 
                description="Receive notifications via SMS (carrier charges may apply)"
                setting="sms" 
              />
            </View>
          </View>
          
          <Text style={styles.note}>
            You can change your notification preferences anytime. We respect your privacy and will only send you relevant notifications based on your preferences.
          </Text>
        </ScrollView>
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholder: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  divider: {
    backgroundColor: '#F3F4F6',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  note: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 20,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
});
