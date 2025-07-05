import { Message } from '@/services/chatService';
import { useChatContext } from '@/services/context/ChatContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  
  const { 
    currentConversation,
    messages,
    loadingMessages,
    sendMessage,
    loadConversation,
    markConversationAsRead,
    loadMoreMessages
  } = useChatContext();
  
  // Find the other participant (not the current user)
  // The ChatContext sorts participants so the other user is always first
  const otherParticipant = currentConversation?.participants && 
    currentConversation.participants.length > 0 
      ? currentConversation.participants[0] 
      : null;
    
  // Load conversation on mount
  useEffect(() => {
    let isActive = true; // Prevent race conditions with cleanup
    
    const loadInitialConversation = async () => {
      if (id && isActive) {
        await loadConversation(id);
        
        // Mark as read after a short delay to ensure it's loaded
        const readTimeout = setTimeout(() => {
          if (isActive) {
            markConversationAsRead(id);
          }
        }, 1000);
        
        return () => clearTimeout(readTimeout);
      }
    };
    
    loadInitialConversation();
    
    return () => {
      isActive = false; // Prevent state updates after unmount
    };
    // Only depend on id to prevent infinite refresh loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  
  // Effect to scroll to latest message when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      // For inverted lists, scrollToOffset with offset 0 brings us to the "bottom" (newest message)
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [messages.length]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !id) return;
    
    try {
      setSending(true);
      await sendMessage(id, messageText.trim());
      setMessageText('');
      
      // Refresh the conversation to see the new message
      await loadConversation(id);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };
  
  // Handle loading more messages (pagination)
  const handleLoadMore = async () => {
    if (loadingMore || loadingMessages) return;
    
    setLoadingMore(true);
    await loadMoreMessages();
    setLoadingMore(false);
  };
  // Extract the current user ID for message rendering
  const getCurrentUserId = React.useMemo(() => {
    // In a real app, this would be fetched from auth
    // For now, we assume the current user is the second participant (index 1)
    return currentConversation?.participants?.[1]?.id || '';
  }, [currentConversation]);
  
  // Render a single message
  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === getCurrentUserId;
    
    return (
      <View style={[
        styles.messageContainer, 
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
      ]}>
        {/* Show avatar for received messages */}
        {!isCurrentUser && (
          <View style={styles.avatarContainer}>
            {item.senderAvatar ? (
              <Image
                source={{ uri: item.senderAvatar }}
                style={styles.messageAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {item.senderName && item.senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.messageContentWrapper}>
          {/* Show sender name for received messages */}
          {!isCurrentUser && (
            <Text style={styles.senderName}>
              {item.senderName}
            </Text>
          )}
          
          <View style={[
            styles.messageBubble, 
            isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
          ]}>
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText
            ]}>
              {item.text}
            </Text>
          </View>
          
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserTime : styles.otherUserTime
          ]}>
            {getTimeString(
              typeof item.createdAt === 'object' && 'seconds' in item.createdAt 
              ? new Date(item.createdAt.seconds * 1000) 
              : new Date(item.createdAt as any)
            )}
          </Text>
        </View>
      </View>
    );
  };
  
  // Get formatted time string
  const getTimeString = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
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
              
              {/* Role badge */}
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
            
            {/* User info */}
            <View style={styles.userInfo}>
              <Text style={styles.headerTitle}>{otherParticipant.name}</Text>
              
              {/* Show related info if available */}
              {currentConversation?.relatedTo && (
                <Text style={styles.headerSubtitle}>
                  {currentConversation.relatedTo.type === 'product' ? 'Product: ' : 
                   currentConversation.relatedTo.type === 'order' ? 'Order: ' : ''}
                  {currentConversation.relatedTo.name || ''}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.headerTitle}>Chat</Text>
        )}
        
        <View style={styles.placeholder} />
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages list */}
        {loadingMessages && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id || Math.random().toString()}
            contentContainerStyle={styles.messageList}
            inverted={true}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={loadingMore ? (
              <ActivityIndicator size="small" color="#3B82F6" style={styles.loadingMore} />
            ) : null}
          />
        )}
        
        {/* Message input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline={true}
            maxLength={1000}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholder: {
    width: 40,
  },
  keyboardAvoid: {
    flex: 1,
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
  messageList: {
    flexGrow: 1,
    padding: 16,
  },
  loadingMore: {
    marginVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  currentUserContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 18, // Align with bottom of message
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageContentWrapper: {
    flex: 1,
  },
  senderName: {
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
  currentUserMessage: {
    backgroundColor: '#3B82F6',
    borderTopRightRadius: 4,
  },
  otherUserMessage: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#0F172A',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  currentUserTime: {
    color: '#E2E8F0',
  },
  otherUserTime: {
    color: '#94A3B8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 12 + (Platform.Version >= 21 ? 0 : 20) : 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
});
