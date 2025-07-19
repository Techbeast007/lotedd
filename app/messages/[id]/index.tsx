import { Image } from '@/components/ui/image';
import { Message } from '@/services/chatService';
import { useChatContext } from '@/services/context/ChatContext';
import { getCurrentUserId, getUserProfileWithCache } from '@/services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Package, Send, ShoppingCart } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define a separate DateSeparator component
const DateSeparator = memo(({ date }: { date: any }) => {
  if (!date) return null;
  
  // Convert Firebase timestamp or Date to JavaScript Date
  const messageDate = typeof date === 'object' && 'seconds' in date
    ? new Date(date.seconds * 1000)
    : new Date(date);
    
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  let dayText;
  if (messageDate.toDateString() === today.toDateString()) {
    dayText = 'Today';
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    dayText = 'Yesterday';
  } else {
    dayText = format(messageDate, 'MMMM d, yyyy');
  }
  
  return (
    <View style={styles.dateSeparator}>
      <Text style={styles.dateSeparatorText}>
        {dayText}
      </Text>
    </View>
  );
});

// Add display name to fix the lint error
DateSeparator.displayName = 'DateSeparator';

const MessageItem = memo(({ 
  item, 
  currentUserId, 
  userProfiles,
  formatMessageDate 
}: { 
  item: Message; 
  currentUserId: string | null; 
  userProfiles: Record<string, any>;
  formatMessageDate: (date: any) => string;
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
  
  // Check if the current user sent this message - using cleaned IDs
  const userIdStr = currentUserId ? extractUid(String(currentUserId)) : '';
  const senderIdStr = item.senderId ? extractUid(String(item.senderId)) : '';
  const isCurrentUser = userIdStr && senderIdStr && userIdStr === senderIdStr;
  
  // Get enhanced profile for the sender if available
  const senderProfile = userProfiles[item.senderId];
  
  // Use enhanced profile data if available
  const senderName = senderProfile?.name || item.senderName || '';
  const senderAvatar = senderProfile?.avatar || item.senderAvatar || '';
  
  // Get badge color based on sender type
  const getSenderBadgeColor = () => {
    switch(item.senderType) {
      case 'seller': return styles.sellerMessageBadge;
      case 'admin': return styles.adminMessageBadge;
      default: return styles.buyerMessageBadge;
    }
  };
  
  return (
    <View style={[
      styles.messageContainer,
      isCurrentUser ? styles.sentMessage : styles.receivedMessage
    ]}>
      {/* Show avatar for received messages */}
      {!isCurrentUser && (
        <View style={styles.messageAvatarContainer}>
          {senderAvatar ? (
            <Image
              source={{ uri: senderAvatar }}
              style={styles.messageAvatar}
              alt={senderName}
            />
          ) : (
            <View style={[
              styles.messageAvatarFallback,
              item.senderType === 'seller' ? styles.sellerAvatarFallback : 
              item.senderType === 'admin' ? styles.adminAvatarFallback : styles.buyerAvatarFallback
            ]}>
              <Text style={styles.messageAvatarInitial}>
                {senderName ? senderName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          
          {/* Small badge showing role */}
          <View style={[styles.messageSenderBadge, getSenderBadgeColor()]}>
            <Text style={styles.messageSenderBadgeText}>
              {item.senderType === 'seller' ? 'S' : 
               item.senderType === 'admin' ? 'A' : 'B'}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.messageContentContainer}>
        {/* Show sender name for received messages */}
        {!isCurrentUser && (
          <Text style={styles.messageSenderName}>
            {senderName}
          </Text>
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.sentBubble : styles.receivedBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.sentMessageText : styles.receivedMessageText
          ]}>
            {item.text}
          </Text>
        </View>
        
        <Text style={[
          styles.timeText,
          isCurrentUser ? styles.sentTimeText : styles.receivedTimeText
        ]}>
          {formatMessageDate(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary rerenders
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.item.text === nextProps.item.text
  );
});

// Add display name to MessageItem
MessageItem.displayName = 'MessageItem';

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  
  const {
    currentConversation,
    messages,
    loadingMessages,
    sendMessage: sendChatMessage,
    loadConversation,
    markConversationAsRead,
    loadMoreMessages,
  } = useChatContext();
  
  // Get current user ID - improved implementation with AsyncStorage as backup
  useEffect(() => {
    const getUser = async () => {
      try {
        // First try with the user service
        const userId = await getCurrentUserId();
        if (userId) {
          setCurrentUserId(userId);
          console.log('Current user ID set from service:', userId);
          return;
        }
        
        // If that fails, try directly with AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.uid) {
            setCurrentUserId(user.uid);
            console.log('Current user ID set from AsyncStorage:', user.uid);
          }
        }
      } catch (error) {
        console.error('Error getting current user ID:', error);
      }
    };
    
    getUser();
  }, []);

  // Load conversation on mount - with improved security and error handling
  useEffect(() => {
    // Don't load until we have a user ID
    if (id && currentUserId) {
      console.log(`Loading conversation ${id} as user ${currentUserId}`);
      
      // Flag to prevent multiple redirects
      let redirecting = false;
      
      // First, try to load the conversation with error handling
      loadConversation(id)
        .then(() => {
          // After loading, check if this is a valid conversation for the current user
          if (!currentConversation) {
            console.warn(`Conversation ${id} not found or failed to load`);
            if (!redirecting) {
              redirecting = true;
              router.replace('/messages');
            }
            return;
          }
          
          // Check both participantIds array and participants array to verify access
          // Use string comparison for safer checks
          const userIdStr = String(currentUserId);
          
          // Debug the conversation data
          console.log(`DEBUG: Chat screen checking authorization for user ${userIdStr} in conversation:`, {
            conversationId: id,
            hasParticipantIds: !!currentConversation.participantIds,
            participantIdsCount: currentConversation.participantIds?.length || 0,
            participantsCount: currentConversation.participants?.length || 0
          });
          
          // Helper function to extract uid from JSON string IDs
          const extractUid = (id: string): string => {
            if (id.startsWith('{') && id.endsWith('}') && id.includes('uid')) {
              try {
                const parsed = JSON.parse(id);
                return parsed.uid || id;
              } catch {
                return id;
              }
            }
            return id;
          };
          
          // Convert IDs to strings for safer comparison and handle JSON string IDs
          const isInParticipantIds = currentConversation.participantIds?.some(id => {
            if (!id) return false;
            const extractedId = extractUid(String(id));
            return extractedId === userIdStr;
          });
          
          const isInParticipants = currentConversation.participants?.some(p => {
            if (!p || !p.id) return false;
            const extractedId = extractUid(String(p.id));
            return extractedId === userIdStr;
          });
          
          // Check if user is authorized to view this conversation
          if (!isInParticipantIds && !isInParticipants) {
            console.error(`User ${userIdStr} is NOT authorized to view conversation ${id} - redirecting to messages`);
            
            // Log participant data for debugging
            console.log(`Conversation participant IDs:`, currentConversation.participantIds?.map(id => 
              `${id} (extracted: ${extractUid(String(id))})`
            ));
            
            if (!redirecting) {
              redirecting = true;
              alert('You are not authorized to view this conversation.');
              router.replace('/messages');
            }
            return;
          }
          
          console.log(`User ${currentUserId} authorized to view conversation ${id}`);
          
          // Mark as read after a short delay to ensure it's loaded
          const readTimeout = setTimeout(() => {
            markConversationAsRead(id);
          }, 1000);
          
          return () => clearTimeout(readTimeout);
        })
        .catch(error => {
          console.error(`Error loading conversation ${id}:`, error);
          // Alert the user about the error before redirecting
          alert('Error loading conversation: ' + (error.message || 'Unknown error'));
          router.replace('/messages');
        });
    }
    // Add currentConversation as dependency so we check again when it loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUserId, currentConversation]);
  
  // Fetch user profiles for all participants
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (!currentConversation?.participants) return;
      
      const profiles: Record<string, any> = {};
      
      // Extract all unique user IDs from participants
      const participantIds = currentConversation.participants
        .filter(p => p.id)
        .map(p => p.id);
      
      // Fetch profile for each participant
      for (const userId of participantIds) {
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
    
    fetchUserProfiles();
  }, [currentConversation]);
  
  // Effect to scroll to bottom when new messages come in
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      // Scroll to the beginning (newest message) of the inverted list
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages]);
  
  // Handle sending a message with improved error handling - now memoized with useCallback
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !id) return;
    
    try {
      console.log(`Sending message in conversation ${id} as user ${currentUserId}`);
      await sendChatMessage(id, message.trim());
      setMessage('');
      
      // No need to manually refresh - the subscription in ChatContext will update the messages
      // This reduces unnecessary rerenders from multiple loadConversation calls
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show a user-friendly error message
      alert('Failed to send message. Please check your connection and try again.');
    }
  }, [message, id, currentUserId, sendChatMessage]);
  
  // Load more messages when scrolling - memoized with useCallback
  const handleLoadMore = useCallback(async () => {
    await loadMoreMessages();
  }, [loadMoreMessages]);
  
  // Memoize the formatMessageDate function
  const formatMessageDate = useCallback((date: any) => {
    // Convert Firebase timestamp or Date to JavaScript Date
    const messageDate = typeof date === 'object' && 'seconds' in date
      ? new Date(date.seconds * 1000)
      : new Date(date);
    
    // Format time as h:mm a (e.g., "3:42 PM")
    return format(messageDate, 'h:mm a');
  }, []);
  
  // Replace renderMessageItem with a memoized version
  const renderMessageItem = useCallback(({ item }: { item: Message }) => {
    return (
      <MessageItem 
        item={item}
        currentUserId={currentUserId}
        userProfiles={userProfiles}
        formatMessageDate={formatMessageDate}
      />
    );
  }, [currentUserId, userProfiles, formatMessageDate]);

  // Memoize the other participant calculation
  const otherParticipant = useMemo(() => {
    if (!currentConversation?.participants || !currentUserId) {
      return currentConversation?.participants?.[0] || null;
    }
    
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
    
    // Clean the user ID for comparison
    const cleanUserId = extractUid(String(currentUserId));
    
    // Find the participant that isn't the current user using cleaned IDs
    const other = currentConversation.participants.find(p => {
      if (!p || !p.id) return false;
      const cleanParticipantId = extractUid(String(p.id));
      return cleanParticipantId !== cleanUserId;
    });
    
    if (other) {
      return other;
    } else {
      return currentConversation.participants[0];
    }
  }, [currentConversation, currentUserId]);
  
  // Get enhanced profile for other participant if available
  const otherUserProfile = otherParticipant?.id ? userProfiles[otherParticipant.id] : null;
      
  // Enhanced display information (prefer enhanced profile if available)
  const displayName = otherUserProfile?.name || otherParticipant?.name || 'Chat';
  const avatarUrl = otherUserProfile?.avatar || otherParticipant?.avatar || '';
  const userType = otherParticipant?.type || '';

  // Check if the user is authorized to view this conversation
  const isAuthorized = currentUserId && (
    // Check if user is in participants array
    currentConversation?.participants?.some(p => p.id === currentUserId) ||
    // Also check participantIds array if it exists
    currentConversation?.participantIds?.includes(currentUserId) || 
    false
  );
  
  // Show unauthorized screen if we know the user isn't allowed to see this
  if (currentUserId && currentConversation && !isAuthorized) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={{
          padding: 20,
          backgroundColor: '#FEF2F2',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#FEE2E2',
          marginHorizontal: 20,
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#B91C1C',
            marginBottom: 12,
          }}>
            Access Denied
          </Text>
          <Text style={{
            fontSize: 16,
            color: '#7F1D1D',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            You are not authorized to view this conversation.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/messages')}
            style={{
              backgroundColor: '#EF4444',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  

  
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity 
            onPress={() => {
              // Navigate to the messages list instead of using router.back()
              // Use replace to avoid stacking multiple screens in navigation history
              router.replace('/messages');
            }} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          
          {otherParticipant ? (
            <View style={styles.headerInfo}>
              {/* Avatar with role indicator */}
              <View style={styles.avatarWithBadge}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                    alt={displayName}
                  />
                ) : (
                  <View style={[
                    styles.avatarFallback,
                    userType === 'seller' ? styles.sellerAvatar : 
                    userType === 'admin' ? styles.adminAvatar : styles.buyerAvatar
                  ]}>
                    <Text style={styles.avatarInitial}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                
                {/* Role badge */}
                <View style={[
                  styles.roleBadge, 
                  userType === 'seller' ? styles.sellerBadge : 
                  userType === 'admin' ? styles.adminBadge : styles.buyerBadge
                ]}>
                  <Text style={styles.roleBadgeText}>
                    {userType === 'seller' ? 'S' : 
                     userType === 'admin' ? 'A' : 'B'}
                  </Text>
                </View>
              </View>
              
              {/* User info */}
              <View style={styles.userInfo}>
                <Text style={styles.headerTitle}>{displayName}</Text>
                
                {/* Show related info if available */}
                {currentConversation?.relatedTo && (
                  <View style={styles.headerRelatedContainer}>
                    {currentConversation.relatedTo.type === 'product' && <Package size={12} color="#6366F1" style={{marginRight: 4}} />}
                    {currentConversation.relatedTo.type === 'order' && <ShoppingCart size={12} color="#6366F1" style={{marginRight: 4}} />}
                    <Text style={styles.headerSubtitle}>
                      {currentConversation.relatedTo.name || 
                        (currentConversation.relatedTo.type.charAt(0).toUpperCase() + 
                        currentConversation.relatedTo.type.slice(1))}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.headerTitle}>Chat</Text>
          )}
          
          <View style={styles.placeholder} />
        </View>
        
        {/* Messages List */}
        {loadingMessages && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id || `${item.createdAt}`}
            contentContainerStyle={styles.messagesList}
            inverted
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 1,
            }}
            // Optimizations to prevent excessive rerenders
            removeClippedSubviews={true}
            maxToRenderPerBatch={15}
            windowSize={20}
            initialNumToRender={15}
            updateCellsBatchingPeriod={50}
            // Use the DateSeparator component for the header
            ListHeaderComponent={messages.length > 0 ? <DateSeparator date={messages[0]?.createdAt} /> : null}
            // This would ideally include multiple date separators based on message dates,
            // but for simplicity we're just showing the most recent date
          />
        )}
        
        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !message.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim()}
          >
            <Send
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  placeholder: {
    width: 40,
  },
  avatarWithBadge: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatar: {
    backgroundColor: '#D1FAE5', // Light green
  },
  buyerAvatar: {
    backgroundColor: '#DBEAFE', // Light blue
  },
  adminAvatar: {
    backgroundColor: '#FEF3C7', // Light yellow
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  buyerBadge: {
    backgroundColor: '#3B82F6', // Blue for buyer
  },
  sellerBadge: {
    backgroundColor: '#10B981', // Green for seller
  },
  adminBadge: {
    backgroundColor: '#F59E0B', // Orange for admin
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  userInfo: {
    justifyContent: 'center',
  },
  headerRelatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
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
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
    flexDirection: 'row',
  },
  messageContentContainer: {
    flex: 1,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
  },
  messageAvatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 18, // Align with the bottom of the message bubble
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerAvatarFallback: {
    backgroundColor: '#DBEAFE', // Light blue
  },
  sellerAvatarFallback: {
    backgroundColor: '#D1FAE5', // Light green
  },
  adminAvatarFallback: {
    backgroundColor: '#FEF3C7', // Light yellow
  },
  messageAvatarInitial: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
    marginLeft: 2,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sentBubble: {
    backgroundColor: '#3B82F6',
    borderTopRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  sentMessageText: {
    color: '#FFFFFF',
  },
  receivedMessageText: {
    color: '#0F172A',
  },
  timeText: {
    fontSize: 12,
    marginTop: 4,
  },
  sentTimeText: {
    color: '#94A3B8',
    textAlign: 'right',
  },
  receivedTimeText: {
    color: '#94A3B8',
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 48,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    position: 'absolute',
    right: 24,
    backgroundColor: '#3B82F6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dateSeparatorText: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  // Additional styles for the enhanced message bubbles
  messageSenderBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  buyerMessageBadge: {
    backgroundColor: '#3B82F6', // Blue for buyer
  },
  sellerMessageBadge: {
    backgroundColor: '#10B981', // Green for seller
  },
  adminMessageBadge: {
    backgroundColor: '#F59E0B', // Orange for admin
  },
  messageSenderBadgeText: {
    color: '#FFFFFF',
    fontSize: 6,
    fontWeight: '700',
  },
});