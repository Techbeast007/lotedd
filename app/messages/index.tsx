import { Image } from '@/components/ui/image';
import { ChatConversation } from '@/services/chatService';
import { useChatContext } from '@/services/context/ChatContext';
import { getCurrentUserId, getUserProfileWithCache } from '@/services/userService';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Package, ShoppingCart } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDistanceToNow } from 'date-fns';

export default function MessagesScreen() {
  const router = useRouter();
  const { conversations, loadingConversations, refreshConversations } = useChatContext();
  const [refreshing, setRefreshing] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
    };
    
    getUser();
  }, []);

  // Fetch user profiles for all participants
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const profiles: Record<string, any> = {};
      
      // Extract all unique user IDs from conversations
      const userIds = new Set<string>();
      conversations.forEach(conv => {
        conv.participants.forEach(p => {
          if (p.id) userIds.add(p.id);
        });
      });
      
      // Fetch profile for each user ID
      for (const userId of userIds) {
        try {
          const profile = await getUserProfileWithCache(userId);
          if (profile) {
            profiles[userId] = profile;
          }
        } catch (error) {
          console.error(`Error fetching profile for ${userId}:`, error);
        }
      }
      
      setUserProfiles(profiles);
    };
    
    if (conversations.length > 0) {
      fetchUserProfiles();
    }
  }, [conversations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };

  const navigateToChat = (conversationId: string) => {
    // Navigate to the chat detail screen
    // Use push here because we want to be able to go back to the messages list
    router.push(`/messages/${conversationId}`);
  };

  const renderConversationItem = ({ item }: { item: ChatConversation }) => {
    // Get the first participant by default (ChatContext sorts participants so other user is first)
    const otherParticipant = item.participants.length > 0 ? 
      // If we know current user ID, find the participant that's not the current user
      (currentUserId ? 
        item.participants.find(p => p.id !== currentUserId) || item.participants[0]
        : item.participants[0])
      : null;
    
    // Try to get enhanced profile from userProfiles
    let enhancedProfile = null;
    if (otherParticipant?.id && userProfiles[otherParticipant.id]) {
      enhancedProfile = userProfiles[otherParticipant.id];
    }
    
    // Get timestamp from Firebase or use current date
    const lastMessageDate = item.lastMessage?.createdAt 
      ? (typeof item.lastMessage.createdAt === 'object' && 'seconds' in item.lastMessage.createdAt 
         ? new Date(item.lastMessage.createdAt.seconds * 1000) 
         : new Date(item.lastMessage.createdAt as any))
      : new Date();
    
    // Format date using date-fns
    const formattedDate = formatDistanceToNow(lastMessageDate, { addSuffix: true });
    
    // Get user role and status
    const userType = otherParticipant?.type || '';
    const userTypeLabel = userType === 'seller' ? 'Seller' : userType === 'buyer' ? 'Buyer' : userType === 'admin' ? 'Admin' : '';
    
    // Get related product/bid info if available
    const relatedInfo = item.relatedTo;
    
    // Get user display information (prefer enhanced profile if available)
    const displayName = enhancedProfile?.name || otherParticipant?.name || '';
    const avatarUrl = enhancedProfile?.avatar || otherParticipant?.avatar || '';
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigateToChat(item.id!)}
      >
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              alt={displayName}
            />
          ) : (
            <View style={[
              styles.avatarFallback,
              userType === 'seller' ? styles.sellerAvatarBg : 
              userType === 'admin' ? styles.adminAvatarBg : styles.buyerAvatarBg
            ]}>
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          
          {userTypeLabel ? (
            <View style={[
              styles.userTypeTag,
              userType === 'seller' ? styles.sellerTag : 
              userType === 'admin' ? styles.adminTag : styles.buyerTag
            ]}>
              <Text style={styles.userTypeText}>{userTypeLabel}</Text>
            </View>
          ) : null}
          
          {/* Prominent name display badge */}
          <View style={styles.nameOverlay}>
            <Text style={styles.nameOverlayText} numberOfLines={1}>
              {displayName || ''}
            </Text>
          </View>
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.participantName} numberOfLines={1}>
              {displayName || ''}
              {userTypeLabel && <Text style={styles.participantRole}> · {userTypeLabel}</Text>}
            </Text>
            <Text style={styles.timeText}>{formattedDate}</Text>
          </View>
          
          {/* Show related info if available */}
          {relatedInfo && (
            <View style={styles.relatedInfoContainer}>
              {relatedInfo.type === 'product' ? (
                <Package size={14} color="#4F46E5" style={{marginRight: 6}} />
              ) : relatedInfo.type === 'order' ? (
                <ShoppingCart size={14} color="#4F46E5" style={{marginRight: 6}} />
              ) : null}
              <Text style={styles.relatedInfoText} numberOfLines={1}>
                {relatedInfo.name || (relatedInfo.type.charAt(0).toUpperCase() + relatedInfo.type.slice(1))}
              </Text>
            </View>
          )}
          
          <View style={styles.messagePreviewContainer}>
            <Text 
              style={styles.messagePreview} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {/* Always show contextual information instead of "No messages yet" */}
              {item.lastMessage?.text || 
                (item.relatedTo?.type === 'product' 
                  ? `About product: ${item.relatedTo.name || ''}`
                  : item.relatedTo?.type === 'order'
                    ? `About order: ${item.relatedTo.name || ''}`
                    : 'Start a conversation')
              }
            </Text>
            
            {/* Show unread badge if there are unread messages */}
            {item.unreadCount && Object.values(item.unreadCount).some(count => count > 0) && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {Object.values(item.unreadCount).reduce((sum, count) => sum + count, 0)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          onPress={() => {
            // Navigate to home or appropriate tab based on role
            // For safety, we'll route to root which will handle role-based routing
            router.replace('/');
          }} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Messages</Text>
        
        <View style={styles.placeholder} />
      </View>
      
      {loadingConversations && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Your messages will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id || Math.random().toString()}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 280,
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginVertical: 6,
    marginHorizontal: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  buyerAvatarBg: {
    backgroundColor: '#DBEAFE',  // Light blue
  },
  sellerAvatarBg: {
    backgroundColor: '#D1FAE5',  // Light green
  },
  adminAvatarBg: {
    backgroundColor: '#FEF3C7',  // Light yellow
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: '#334155',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 4,
  },
  participantRole: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  userTypeTag: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  buyerTag: {
    backgroundColor: '#3B82F6',  // Blue for buyer
  },
  sellerTag: {
    backgroundColor: '#10B981',  // Green for seller
  },
  adminTag: {
    backgroundColor: '#F59E0B',  // Orange for admin
  },
  userTypeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    minWidth: 60,
    maxWidth: 110,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  nameOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  relatedInfoContainer: {
    marginBottom: 6,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  relatedInfoText: {
    fontSize: 13,
    color: '#4338CA',
    fontWeight: '600',
    flex: 1,
  },
});
