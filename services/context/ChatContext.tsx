import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
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
        // Get user data from AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        if (!userData) {
          console.error('No user data found in AsyncStorage');
          setLoadingConversations(false);
          return;
        }
        
        const user = JSON.parse(userData);
        const uid = user.uid;
        
        if (!uid) {
          console.error('User ID is missing from user data');
          setLoadingConversations(false);
          return;
        }
        
        setUserId(uid);
        
        // Get additional user profile data from Firestore if needed
        try {
          const userDoc = await firestore().collection('users').doc(uid).get();
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Use Firestore data if available, otherwise fall back to AsyncStorage data
            setUserName(userData?.displayName || user.displayName || user.email || 'User');
            
            // Set avatar if available in Firestore
            if (userData?.photoURL) {
              setUserAvatar(userData.photoURL);
            } else if (user.photoURL) {
              setUserAvatar(user.photoURL);
            }
          } else {
            // Fall back to AsyncStorage data
            setUserName(user.displayName || user.email || 'User');
            if (user.photoURL) {
              setUserAvatar(user.photoURL);
            }
          }
        } catch (firestoreError) {
          console.error('Error fetching user data from Firestore:', firestoreError);
          // Fall back to AsyncStorage data
          setUserName(user.displayName || user.email || 'User');
          if (user.photoURL) {
            setUserAvatar(user.photoURL);
          }
        }
        
        // Determine user type from stored role
        const role = await AsyncStorage.getItem('currentRole');
        setUserType(role === 'seller' ? ParticipantType.SELLER : ParticipantType.BUYER);
        
        console.log('Chat context user data loaded:', {
          uid,
          name: userName || user.displayName || user.email || 'User',
          type: role === 'seller' ? 'SELLER' : 'BUYER',
          hasAvatar: !!(user.photoURL || userAvatar)
        });
        
        // Load conversations once we have user data
        await refreshConversations();
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
  // Enhanced with strict user-based access control to fix privacy issues
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!userId) {
      console.log('Cannot load conversation: No user ID available');
      return;
    }
    
    try {
      setLoadingMessages(true);
      console.log(`Loading conversation ${conversationId} for user ${userId}`);
      
      // Get conversation details with user ID verification
      const conversation = await chatService.getConversationById(conversationId, userId);
      
      // If conversation is null, the user is not authorized
      if (!conversation) {
        console.warn(`User ${userId} not authorized to access conversation ${conversationId}`);
        setCurrentConversation(null);
        setMessages([]);
        setLoadingMessages(false);
        return;
      }
      
      // Double check that this user is truly a participant in this conversation
      const isAuthorized = 
        conversation.participantIds?.includes(userId) ||
        conversation.participants?.some(p => p.id === userId);
      
      if (!isAuthorized) {
        console.error(`SECURITY ISSUE: User ${userId} found unauthorized access to conversation ${conversationId}`);
        setCurrentConversation(null);
        setMessages([]);
        setLoadingMessages(false);
        return;
      }
      
      // Sort participants so the other user is first (for display purposes)
      if (conversation.participants) {
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
      
      // Get messages with user ID verification
      const { messages: conversationMessages, lastVisible: lastDoc } = await chatService.getMessages(
        conversationId,
        20,
        undefined,
        userId
      );
      
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
  // Enhanced with user-based access control
  const loadMoreMessages = useCallback(async (): Promise<boolean> => {
    if (!userId || !currentConversation || !lastVisible) return false;
    
    try {
      console.log(`Loading more messages for conversation ${currentConversation.id} as user ${userId}`);
      
      const { messages: moreMessages, lastVisible: newLastVisible } = await chatService.getMessages(
        currentConversation.id as string,
        20,
        lastVisible,
        userId // Pass userId for authorization check
      );
      
      if (moreMessages.length === 0) {
        console.log('No more messages to load');
        return false;
      }
      
      console.log(`Loaded ${moreMessages.length} more messages`);
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
    if (!userId || !userName) {
      console.error('Cannot send message: User ID or name is missing');
      return;
    }
    
    try {
      // Log the sender information for debugging
      console.log('Sending message as:', {
        userId,
        userName,
        userType,
        hasAvatar: !!userAvatar
      });
      
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
        senderName: userName || 'Unknown User', // Ensure we always have a name
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
