import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ChatConversation, chatService, Message, ParticipantType } from '../chatService';

interface ChatContextType {
  conversations: ChatConversation[];
  loadingConversations: boolean;
  currentConversation: ChatConversation | null;
  messages: Message[];
  loadingMessages: boolean;
  unreadCount: number;
  sendMessage: (
    conversationId: string, 
    text: string, 
    attachments?: { type: 'image' | 'document' | 'product'; url: string; name: string; size?: number }[]
  ) => Promise<void>;
  getOrCreateConversation: (
    otherParticipant: { id: string; name: string; type: ParticipantType; avatar?: string },
    relatedTo?: { type: 'order' | 'product' | 'general'; id?: string; name?: string }
  ) => Promise<string>;
  loadConversation: (conversationId: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  loadMoreMessages: () => Promise<boolean>;
  refreshConversations: () => Promise<void>;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userType, setUserType] = useState<ParticipantType>(ParticipantType.BUYER);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [lastVisible, setLastVisible] = useState<any>(null);
  
  // Refresh conversations - defined before useEffect to avoid dependency issues
  const refreshConversations = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoadingConversations(true);
      const userConversations = await chatService.getConversations(userId);
      setConversations(userConversations);
      
      // Calculate total unread count
      const total = await chatService.getTotalUnreadCount(userId);
      setUnreadCount(total);
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [userId]);
  
  // Load user data on mount
  // Use a separate useEffect for loading user data - only runs once at mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setUserId(user.uid);
          setUserName(user.displayName || user.email || 'User');
          
          // Determine user type from stored role
          const role = await AsyncStorage.getItem('currentRole');
          setUserType(role === 'seller' ? ParticipantType.SELLER : ParticipantType.BUYER);
          
          // Set avatar if available
          if (user.photoURL) {
            setUserAvatar(user.photoURL);
          }
          
          // Load conversations once we have user data
          await refreshConversations();
        }
      } catch (error) {
        console.error('Error loading user data in chat context:', error);
      } finally {
        setLoadingConversations(false);
      }
    };
    
    loadUserData();
    // Only run this effect once at component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Separate useEffect for subscription management
  useEffect(() => {
    // Don't set up subscription if userId is not available
    if (!userId) return;
    
    // Set up subscription for live updates
    let conversationsUnsubscribe: () => void;
    
    const setupSubscriptions = async () => {
      // Subscribe to conversations to keep them updated
      conversationsUnsubscribe = chatService.subscribeToConversations(
        userId,
        (updatedConversations) => {
          // To prevent unnecessary re-renders, we need to:
          // 1. Use a stable string representation to compare data
          // 2. Only update state if the data actually changed
          
          // First check if there's a meaningful difference
          let hasChanged = false;
          let newTotal = 0;
          
          // Calculate total unread and check for changes
          if (updatedConversations.length !== conversations.length) {
            hasChanged = true;
          } else {
            // Check for changes in conversation data that we care about
            for (let i = 0; i < updatedConversations.length; i++) {
              const updated = updatedConversations[i];
              const existing = conversations[i];
              
              // Check key properties that would require a UI update
              if (updated.id !== existing.id ||
                  updated.updatedAt !== existing.updatedAt ||
                  JSON.stringify(updated.lastMessage) !== JSON.stringify(existing.lastMessage) ||
                  JSON.stringify(updated.unreadCount) !== JSON.stringify(existing.unreadCount)) {
                hasChanged = true;
                break;
              }
            }
          }
          
          // Calculate total unread regardless
          updatedConversations.forEach(conv => {
            if (conv.unreadCount && conv.unreadCount[userId]) {
              newTotal += conv.unreadCount[userId];
            }
          });
          
          // Update state only if necessary
          if (hasChanged) {
            setConversations(updatedConversations);
          }
          
          // Update unread count independently if it changed
          if (newTotal !== unreadCount) {
            setUnreadCount(newTotal);
          }
        }
      );
    };
    
    setupSubscriptions();
    
    // Clean up subscriptions on unmount
    return () => {
      if (conversationsUnsubscribe) {
        conversationsUnsubscribe();
      }
    };
    // We need conversations and unreadCount for comparison, but we don't want
    // the effect to re-run when they change (it would create a new subscription)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  
  // Load a specific conversation and its messages - memoized to prevent unnecessary rerenders
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!userId) return;
    
    try {
      setLoadingMessages(true);
      
      // Get conversation details
      const conversation = await chatService.getConversationById(conversationId);
      
      // Sort participants so the other user is first (for display purposes)
      if (conversation && conversation.participants) {
        // Make a copy of the participants array
        const sortedParticipants = [...conversation.participants];
        
        // Put the current user last and other participants first
        sortedParticipants.sort((a, b) => {
          if (a.id === userId) return 1;
          if (b.id === userId) return -1;
          return 0;
        });
        
        conversation.participants = sortedParticipants;
      }
      
      setCurrentConversation(conversation);
      
      // Get messages
      const { messages: conversationMessages, lastVisible: lastDoc } = await chatService.getMessages(conversationId);
      setMessages(conversationMessages);
      setLastVisible(lastDoc);
      
      // Mark messages as read
      await chatService.markMessagesAsRead(conversationId, userId);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [userId]);
  
  // Load more messages (pagination) - memoized to prevent unnecessary rerenders
  const loadMoreMessages = useCallback(async (): Promise<boolean> => {
    if (!userId || !currentConversation || !lastVisible) return false;
    
    try {
      const { messages: moreMessages, lastVisible: newLastVisible } = await chatService.getMessages(
        currentConversation.id as string,
        20,
        lastVisible
      );
      
      if (moreMessages.length === 0) return false;
      
      setMessages(prevMessages => [...prevMessages, ...moreMessages]);
      setLastVisible(newLastVisible);
      
      return moreMessages.length > 0;
    } catch (error) {
      console.error('Error loading more messages:', error);
      return false;
    }
  }, [userId, currentConversation, lastVisible]);
  
  // Mark conversation as read - memoized to prevent unnecessary rerenders
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!userId) return;
    
    try {
      await chatService.markMessagesAsRead(conversationId, userId);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [userId]);
  
  // Send a message - memoized to prevent unnecessary rerenders
  const sendMessage = useCallback(async (
    conversationId: string,
    text: string,
    attachments?: { type: 'image' | 'document' | 'product'; url: string; name: string; size?: number }[]
  ) => {
    if (!userId || !userName) return;
    
    try {
      // Create a clean message object with no undefined fields
      const messageData: {
        text: string;
        senderId: string;
        senderName: string;
        senderType: ParticipantType;
        senderAvatar?: string;
        attachments?: { type: 'image' | 'document' | 'product'; url: string; name: string; size?: number }[];
      } = {
        text,
        senderId: userId,
        senderName: userName,
        senderType: userType,
      };
      
      // Only add avatar if it exists
      if (userAvatar) {
        messageData.senderAvatar = userAvatar;
      }
      
      // Only add attachments if they exist
      if (attachments && attachments.length > 0) {
        messageData.attachments = attachments;
      }
      
      await chatService.sendMessage(conversationId, messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [userId, userName, userType, userAvatar]);
  
  // Get or create a conversation with another user - memoized to prevent unnecessary rerenders
  const getOrCreateConversation = useCallback(async (
    otherParticipant: { id: string; name: string; type: ParticipantType; avatar?: string },
    relatedTo?: { type: 'order' | 'product' | 'general'; id?: string; name?: string }
  ): Promise<string> => {
    if (!userId || !userName) {
      throw new Error('User not authenticated');
    }
    
    // Validate other participant
    if (!otherParticipant?.id) {
      console.error('Invalid other participant', otherParticipant);
      throw new Error('Other participant must have an ID');
    }
    
    // Create cleaned participant objects - no undefined/null values
    let currentUserParticipant: { 
      id: string; 
      name: string; 
      type: ParticipantType;
      avatar?: string;
    } = {
      id: userId,
      name: userName || 'User',
      type: userType,
    };
    
    // Only add avatar if it exists and is not an empty string
    if (userAvatar) {
      currentUserParticipant.avatar = userAvatar;
    }
    
    let cleanedOtherParticipant: { 
      id: string; 
      name: string; 
      type: ParticipantType;
      avatar?: string;
    } = {
      id: otherParticipant.id,
      name: otherParticipant.name || 'Other User',
      type: otherParticipant.type,
    };
    
    // Only add avatar if it exists and is not an empty string
    if (otherParticipant.avatar) {
      cleanedOtherParticipant.avatar = otherParticipant.avatar;
    }
    
    const participants = [currentUserParticipant, cleanedOtherParticipant];
    
    // Clean related to object - ensure no undefined/null values
    let cleanedRelatedTo;
    if (relatedTo) {
      cleanedRelatedTo = {
        type: relatedTo.type,
        id: relatedTo.id || '',  // Empty string fallback
        name: relatedTo.name || '',  // Empty string fallback
      };
    }
    
    try {
      return await chatService.findOrCreateConversation(participants, cleanedRelatedTo);
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }, [userId, userName, userType, userAvatar]);
  
  const value: ChatContextType = {
    conversations,
    loadingConversations,
    currentConversation,
    messages,
    loadingMessages,
    unreadCount,
    sendMessage,
    getOrCreateConversation,
    loadConversation,
    markConversationAsRead,
    loadMoreMessages,
    refreshConversations,
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
