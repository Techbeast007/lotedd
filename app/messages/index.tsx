import { Image } from '@/components/ui/image';
import { ChatConversation } from '@/services/chatService';
import { useChatContext } from '@/services/context/ChatContext';
import { getCurrentUserId, getUserProfileWithCache } from '@/services/userService';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Package, ShoppingCart } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
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

// Memoized conversation item component
const ConversationItem = memo(({ 
  item, 
  currentUserId, 
  userProfiles, 
  onPress 
}: { 
  item: ChatConversation; 
  currentUserId: string | null; 
  userProfiles: Record<string, any>; 
  onPress: (id: string) => void;
}) => {
  // Helper function to extract uid from JSON string IDs
  const extractUid = (id: string): string => {
    if (id && typeof id === 'string' && id.startsWith('{') && id.endsWith('}') && id.includes('uid')) {
      try {
        const parsed = JSON.parse(id);
        return parsed.uid || id;
      } catch {
        return id;
      }
    }
    return String(id);
  };
  
  // Clean the current user ID
  const cleanUserId = currentUserId ? extractUid(String(currentUserId)) : '';
  
  // Find the other participant (not the current user)
  const otherParticipant = useMemo(() => {
    if (!item.participants?.length) return null;
    
    // If we know current user ID, find the participant that's not the current user
    if (cleanUserId) {
      return item.participants.find(p => {
        if (!p || !p.id) return false;
        return extractUid(String(p.id)) !== cleanUserId;
      }) || item.participants[0];
    }
    
    // Otherwise, just return the first participant
    return item.participants[0];
  }, [item.participants, cleanUserId]);
  
  // Get enhanced profile from userProfiles
  const enhancedProfile = useMemo(() => {
    if (!otherParticipant?.id) return null;
    
    const cleanParticipantId = extractUid(String(otherParticipant.id));
    return userProfiles[cleanParticipantId] || userProfiles[otherParticipant.id] || null;
  }, [otherParticipant?.id, userProfiles]);
  
  // Format timestamp
  const formattedDate = useMemo(() => {
    if (!item.lastMessage?.createdAt) return '';
    
    // Get timestamp from Firebase or use current date
    const lastMessageDate = item.lastMessage.createdAt 
      ? (typeof item.lastMessage.createdAt === 'object' && 'seconds' in item.lastMessage.createdAt 
         ? new Date(item.lastMessage.createdAt.seconds * 1000) 
         : new Date(item.lastMessage.createdAt as any))
      : new Date();
    
    // Format date using date-fns
    return formatDistanceToNow(lastMessageDate, { addSuffix: true });
  }, [item.lastMessage?.createdAt]);
  
  // Get user information
  const userType = otherParticipant?.type || '';
  const userTypeLabel = userType === 'seller' ? 'Seller' : userType === 'buyer' ? 'Buyer' : userType === 'admin' ? 'Admin' : '';
  const displayName = enhancedProfile?.name || otherParticipant?.name || '';
  const avatarUrl = enhancedProfile?.avatar || otherParticipant?.avatar || '';
  
  // Get unread count
  const unreadCount = useMemo(() => {
    if (!item.unreadCount || !currentUserId) return 0;
    
    // Check both the raw userId and the cleaned userId in unreadCount
    const cleanUserId = extractUid(String(currentUserId));
    let count = 0;
    
    // Check for the direct match
    if (item.unreadCount[currentUserId]) {
      count += item.unreadCount[currentUserId];
    }
    
    // Check for the cleaned ID version if it's different
    if (cleanUserId !== currentUserId && item.unreadCount[cleanUserId]) {
      count += item.unreadCount[cleanUserId];
    }
    
    // Check for any JSON string versions of this ID
    Object.keys(item.unreadCount).forEach(key => {
      if (extractUid(key) === cleanUserId && key !== currentUserId && key !== cleanUserId) {
        count += item.unreadCount[key] || 0;
      }
    });
    
    return count;
  }, [item.unreadCount, currentUserId]);
  
  // Handle click
  const handlePress = useCallback(() => {
    if (item.id) {
      onPress(item.id);
    }
  }, [item.id, onPress]);
  
  return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={handlePress}
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
              {displayName ? displayName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
        
        {/* Role badge */}
        {userTypeLabel && (
          <View style={[
            styles.roleBadge,
            userType === 'seller' ? styles.sellerRoleBadge : 
            userType === 'admin' ? styles.adminRoleBadge : styles.buyerRoleBadge
          ]}>
            <Text style={styles.roleBadgeText}>
              {userType.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.conversationHeader}>
          <Text 
            style={styles.conversationName} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {displayName || 'Unknown'}
          </Text>
          <Text style={styles.timeText}>{formattedDate}</Text>
        </View>
        
        <View style={styles.messagePreview}>
          {/* Last message preview */}
          <Text 
            style={styles.lastMessageText} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {item.lastMessage?.text || 'No messages'}
          </Text>
          
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        
        {/* Related info badge if available */}
        {item.relatedTo && (
          <View style={styles.relatedInfoBadge}>
            {item.relatedTo.type === 'product' && <Package size={10} color="#6366F1" style={{marginRight: 2}} />}
            {item.relatedTo.type === 'order' && <ShoppingCart size={10} color="#6366F1" style={{marginRight: 2}} />}
            <Text style={styles.relatedInfoText} numberOfLines={1} ellipsizeMode="tail">
              {item.relatedTo.name || item.relatedTo.type}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  if (prevProps.item.id !== nextProps.item.id) return false;
  if (prevProps.currentUserId !== nextProps.currentUserId) return false;
  
  // Check if last message has changed
  const prevLastMessage = prevProps.item.lastMessage;
  const nextLastMessage = nextProps.item.lastMessage;
  if ((prevLastMessage?.text !== nextLastMessage?.text) || 
      (prevLastMessage?.createdAt !== nextLastMessage?.createdAt)) {
    return false;
  }
  
  // Check if unread count changed
  const prevUnread = prevProps.item.unreadCount;
  const nextUnread = nextProps.item.unreadCount;
  if (JSON.stringify(prevUnread) !== JSON.stringify(nextUnread)) {
    return false;
  }
  
  // If we get here, no important props changed
  return true;
});

// Add display name
ConversationItem.displayName = 'ConversationItem';

export default function MessagesScreen() {
  const router = useRouter();
  const { conversations: allConversations, loadingConversations, refreshConversations } = useChatContext();
  const [refreshing, setRefreshing] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);
  const insets = useSafeAreaInsets();

  // Helper function to extract uid from JSON string IDs - memoized to prevent recreation
  const extractUid = useCallback((id: string): string => {
    if (id && typeof id === 'string' && id.startsWith('{') && id.endsWith('}') && id.includes('uid')) {
      try {
        const parsed = JSON.parse(id);
        return parsed.uid || id;
      } catch {
        return id;
      }
    }
    return String(id);
  }, []);

  // Get current user ID - separated from filtering conversations
  useEffect(() => {
    const getUser = async () => {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
    };
    
    getUser();
  }, []);
  
  // Filter conversations separately from getting the user ID
  // This prevents having to refetch the user ID when conversations change
  useEffect(() => {
    // Only filter if we have a user ID
    if (!currentUserId || allConversations.length === 0) {
      setFilteredConversations([]);
      return;
    }
    
    const userIdStr = String(currentUserId);
    const filtered = allConversations.filter(conversation => {
      // Check participantIds array with safer string comparison and JSON parsing
      const userIsInParticipantIds = conversation.participantIds?.some(id => {
        if (!id) return false;
        const extractedId = extractUid(String(id));
        return extractedId === userIdStr;
      });
      
      // Check participants array with safer string comparison and JSON parsing
      const userIsParticipant = conversation.participants?.some(p => {
        if (!p || !p.id) return false;
        const extractedId = extractUid(String(p.id));
        return extractedId === userIdStr;
      });
      
      return userIsInParticipantIds || userIsParticipant;
    });
    
    console.log(`Filtered conversations: ${filtered.length} of ${allConversations.length} total`);
    setFilteredConversations(filtered);
  }, [allConversations, currentUserId, extractUid]);

  // Fetch user profiles for all participants - optimized to avoid unnecessary fetches
  useEffect(() => {
    // Skip if there are no conversations
    if (filteredConversations.length === 0) return;
    
    const fetchUserProfiles = async () => {
      // Extract all unique user IDs from conversations
      const userIds = new Set<string>();
      filteredConversations.forEach((conv: ChatConversation) => {
        conv.participants.forEach((p: {id?: string}) => {
          if (p.id) userIds.add(String(p.id));
        });
      });
      
      // Get a list of user IDs we don't already have profiles for
      const missingUserIds = Array.from(userIds).filter(id => !userProfiles[id]);
      
      // Skip if we already have all the profiles we need
      if (missingUserIds.length === 0) {
        console.log('All user profiles already loaded');
        return;
      }
      
      console.log(`Fetching ${missingUserIds.length} missing user profiles`);
      
      // Create a copy of the current profiles
      const updatedProfiles = { ...userProfiles };
      let hasNewProfiles = false;
      
      // Only fetch profiles for users we don't already have
      for (const userId of missingUserIds) {
        try {
          const profile = await getUserProfileWithCache(userId);
          if (profile) {
            updatedProfiles[userId] = profile;
            hasNewProfiles = true;
          }
        } catch (error) {
          console.error(`Error fetching profile for ${userId}:`, error);
        }
      }
      
      // Only update state if we actually have new profiles
      if (hasNewProfiles) {
        setUserProfiles(updatedProfiles);
      }
    };
    
    fetchUserProfiles();
  }, [filteredConversations, userProfiles]);

  // Memoize the refresh handler to prevent recreation on renders
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  }, [refreshConversations]);

  // Memoize the navigation handler to prevent recreation on renders
  const navigateToChat = useCallback((conversationId: string) => {
    // Navigate to the chat detail screen
    // Use push here because we want to be able to go back to the messages list
    router.push(`/messages/${conversationId}`);
  }, [router]);  // Memoize the renderConversationItem function to prevent recreation on renders
  const renderConversationItem = useCallback(({ item }: { item: ChatConversation }) => {
    return (
      <ConversationItem 
        item={item}
        currentUserId={currentUserId}
        userProfiles={userProfiles}
        onPress={navigateToChat}
      />
    );
  }, [currentUserId, userProfiles, navigateToChat]);

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
      
      {loadingConversations && filteredConversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Your messages will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id || Math.random().toString()}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={15}
          updateCellsBatchingPeriod={50}
          getItemLayout={(data, index) => ({
            length: 80, // approximate height of your items
            offset: 80 * index,
            index,
          })}
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
