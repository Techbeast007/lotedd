import { ChatConversation } from '@/services/chatService';
import { useChatContext } from '@/services/context/ChatContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  const {
    conversations,
    loadingConversations,
    refreshConversations
  } = useChatContext();

  // Get the current user ID from AsyncStorage when component mounts
  useEffect(() => {
    const getUserId = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setCurrentUserId(user.uid);
          console.log('Messages screen user ID:', user.uid);
        }
      } catch (error) {
        console.error('Error getting current user ID:', error);
      }
    };
    
    getUserId();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };
  
  // Find the other participant in a conversation (not the current user)
  const getOtherParticipant = (conversation: ChatConversation) => {
    if (!conversation.participants || conversation.participants.length === 0) {
      return null;
    }
    
    if (!currentUserId) {
      // If we don't have the current user ID yet, just return the first participant
      return conversation.participants[0];
    }
    
    // Find the participant that isn't the current user
    const other = conversation.participants.find(p => p.id !== currentUserId);
    
    // If we couldn't find another participant, fallback to the first one
    return other || conversation.participants[0];
  };
  
  // Format the timestamp for last message
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    
    const date = typeof timestamp === 'object' && 'seconds' in timestamp 
      ? new Date(timestamp.seconds * 1000) 
      : new Date(timestamp);
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };
  
  const renderConversationItem = ({ item }: { item: ChatConversation }) => {
    const otherParticipant = getOtherParticipant(item);
    if (!otherParticipant) return null;
    
    const unread = item.unreadCount && currentUserId ? (item.unreadCount[currentUserId] || 0) : 0;
    
    return (
      <Link
        href={{
          pathname: '/chat',
          params: { id: item.id },
        }}
        asChild
      >
        <TouchableOpacity style={styles.conversationItem}>
          {/* User avatar */}
          <View style={styles.avatarContainer}>
            {otherParticipant.avatar ? (
              <Image
                source={{ uri: otherParticipant.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {otherParticipant.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            
            {/* Role indicator */}
            <View style={[
              styles.roleBadge,
              otherParticipant.type === 'seller' ? styles.sellerBadge :
              otherParticipant.type === 'admin' ? styles.adminBadge : styles.buyerBadge
            ]}>
              <Text style={styles.roleBadgeText}>
                {otherParticipant.type === 'seller' ? 'S' :
                 otherParticipant.type === 'admin' ? 'A' : 'B'}
              </Text>
            </View>
          </View>
          
          {/* Conversation info */}
          <View style={styles.conversationInfo}>
            <View style={styles.nameTimeRow}>
              <Text style={styles.participantName} numberOfLines={1}>
                {otherParticipant.name}
              </Text>
              
              {item.lastMessage && (
                <Text style={styles.timeText}>
                  {formatTimestamp(item.lastMessage.createdAt)}
                </Text>
              )}
            </View>
            
            {item.relatedTo && item.relatedTo.name ? (
              <Text style={styles.relatedToText} numberOfLines={1}>
                {item.relatedTo.type === 'product' ? '🏷️ ' :
                 item.relatedTo.type === 'order' ? '📦 ' : ''}
                {item.relatedTo.name}
              </Text>
            ) : null}
            
            {item.lastMessage ? (
              <View style={styles.messagePreviewRow}>
                <Text 
                  style={[
                    styles.messagePreview,
                    unread > 0 && styles.unreadMessagePreview
                  ]} 
                  numberOfLines={1}
                >
                  {item.lastMessage.text}
                </Text>
                
                {unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unread > 99 ? '99+' : unread}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.noMessagesText}>No messages yet</Text>
            )}
          </View>
        </TouchableOpacity>
      </Link>
    );
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Messages</Text>
        
        <View style={styles.placeholder} />
      </View>
      
      {/* Conversations List */}
      {loadingConversations && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageSquare size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Conversations</Text>
          <Text style={styles.emptyText}>
            You don&apos;t have any messages yet. Messages from buyers, sellers, and admins will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  list: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748B',
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  buyerBadge: {
    backgroundColor: '#3B82F6', // blue
  },
  sellerBadge: {
    backgroundColor: '#EAB308', // yellow
  },
  adminBadge: {
    backgroundColor: '#EF4444', // red
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
  },
  relatedToText: {
    fontSize: 13,
    color: '#3B82F6',
    marginBottom: 4,
  },
  messagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  unreadMessagePreview: {
    color: '#0F172A',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noMessagesText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 300,
  },
});
