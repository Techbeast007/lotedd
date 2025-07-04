'use client';

import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, ChevronRight, Globe, Moon, Shield } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function AppSettingsScreen() {
  const router = useRouter();
  
  // App settings state
  const [settings, setSettings] = useState({
    darkMode: false,
    biometricLogin: false,
    pushNotifications: true,
    emailNotifications: true,
    language: 'English',
    currency: 'USD',
    autoPlay: true,
    dataUsage: 'Standard',
  });

  const handleToggleSetting = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
    
    // In a real app, you would save these settings to AsyncStorage or server
    // For example:
    // AsyncStorage.setItem('appSettings', JSON.stringify({
    //   ...settings,
    //   [key]: !settings[key as keyof typeof settings]
    // }));
  };

  const handleLanguageChange = () => {
    Alert.alert('Language', 'This is a placeholder. In a real app, this would open a language selection screen.');
  };

  const handleCurrencyChange = () => {
    Alert.alert('Currency', 'This is a placeholder. In a real app, this would open a currency selection screen.');
  };

  const handleDataUsageChange = () => {
    Alert.alert(
      'Data Usage',
      'Select data usage preference',
      [
        { text: 'Low', onPress: () => setSettings(prev => ({ ...prev, dataUsage: 'Low' })) },
        { text: 'Standard', onPress: () => setSettings(prev => ({ ...prev, dataUsage: 'Standard' })) },
        { text: 'High', onPress: () => setSettings(prev => ({ ...prev, dataUsage: 'High' })) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? This will log you out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'Cache cleared successfully. Please log in again.');
              router.replace('/role-selection');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Setting item with switch
  const SettingToggle = ({ icon, title, value, onChange }: { 
    icon: React.ReactNode; 
    title: string; 
    value: boolean; 
    onChange: () => void;
  }) => (
    <HStack style={styles.settingItem}>
      <HStack space="md" alignItems="center">
        {icon}
        <Text style={styles.settingText}>{title}</Text>
      </HStack>
      <Switch
        size="sm"
        value={value}
        onToggle={onChange}
        trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
      />
    </HStack>
  );

  // Setting item with chevron
  const SettingOption = ({ 
    icon, 
    title, 
    value, 
    onPress 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    value?: string; 
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <HStack space="md" alignItems="center">
        {icon}
        <Text style={styles.settingText}>{title}</Text>
      </HStack>
      <HStack space="xs" alignItems="center">
        {value && <Text style={styles.settingValue}>{value}</Text>}
        <ChevronRight size={18} color="#9CA3AF" />
      </HStack>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Heading style={styles.headerTitle}>App Settings</Heading>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <Box style={styles.section}>
          <Text style={styles.sectionHeader}>Appearance</Text>
          <View style={styles.card}>
            <SettingToggle 
              icon={<Moon size={20} color="#4B5563" />}
              title="Dark Mode"
              value={settings.darkMode}
              onChange={() => handleToggleSetting('darkMode')}
            />
            <Divider style={styles.divider} />
            <SettingOption
              icon={<Globe size={20} color="#4B5563" />}
              title="Language"
              value={settings.language}
              onPress={handleLanguageChange}
            />
            <Divider style={styles.divider} />
            <SettingOption
              icon={<Text style={styles.currencyIcon}>$</Text>}
              title="Currency"
              value={settings.currency}
              onPress={handleCurrencyChange}
            />
          </View>
        </Box>
        
        {/* Content & Media */}
        <Box style={styles.section}>
          <Text style={styles.sectionHeader}>Content & Media</Text>
          <View style={styles.card}>
            <SettingToggle 
              icon={<Moon size={20} color="#4B5563" />}
              title="Auto-play Videos"
              value={settings.autoPlay}
              onChange={() => handleToggleSetting('autoPlay')}
            />
            <Divider style={styles.divider} />
            <SettingOption
              icon={<Moon size={20} color="#4B5563" />}
              title="Data Usage"
              value={settings.dataUsage}
              onPress={handleDataUsageChange}
            />
          </View>
        </Box>
        
        {/* Security */}
        <Box style={styles.section}>
          <Text style={styles.sectionHeader}>Security</Text>
          <View style={styles.card}>
            <SettingToggle 
              icon={<Shield size={20} color="#4B5563" />}
              title="Biometric Login"
              value={settings.biometricLogin}
              onChange={() => handleToggleSetting('biometricLogin')}
            />
          </View>
        </Box>
        
        {/* Data Management */}
        <Box style={styles.section}>
          <Text style={styles.sectionHeader}>Data Management</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dangerItem} onPress={handleClearCache}>
              <HStack space="md" alignItems="center">
                <AlertTriangle size={20} color="#EF4444" />
                <Text style={styles.dangerText}>Clear Cache & Data</Text>
              </HStack>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Clearing cache will remove all temporary data and log you out of the app.
          </Text>
        </Box>
        
        <Text style={styles.versionText}>
          Version 1.0.0 {Platform.OS === 'ios' ? '(iOS)' : '(Android)'}
        </Text>
      </ScrollView>
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
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingText: {
    fontSize: 16,
    color: '#1F2937',
  },
  settingValue: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  divider: {
    backgroundColor: '#F3F4F6',
  },
  dangerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dangerText: {
    fontSize: 16,
    color: '#EF4444',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: 16,
  },
  currencyIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    width: 20,
    textAlign: 'center',
  },
});
