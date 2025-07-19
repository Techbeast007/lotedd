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
    if (!userId) {
      console.log('Cannot refresh conversations: No user ID available');
      return;
    }
    
    // Prevent refreshing if already loading
    if (loadingConversations) {
      console.log('Already refreshing conversations, skipping duplicate request');
      return;
    }
    
    try {
      setLoadingConversations(true);
      console.log(`Refreshing conversations for user: ${userId}`);
      
      const userConversations = await chatService.getConversations(userId);
      
      // Log useful diagnostic information
      console.log(`Retrieved ${userConversations.length} conversations`);
      if (userConversations.length > 0) {
        console.log('First conversation participants:', 
          userConversations[0].participants?.map(p => ({ id: p.id, type: p.type })));
      }
      
      setConversations(userConversations);
      
      // Calculate total unread count
      const total = await chatService.getTotalUnreadCount(userId);
      setUnreadCount(total);
      console.log(`Total unread count: ${total}`);
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [userId, loadingConversations]);
  
  // Load user data on mount
  // Use a separate useEffect for loading user data - only runs once at mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get user data from AsyncStorage - try multiple methods for robustness
        let uid = null;
        
        // First try the users collection in Firestore through AsyncStorage
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            if (user && user.uid) {
              uid = user.uid;
              console.log('Chat context: User ID loaded from AsyncStorage user object:', uid);
            }
          }
        } catch (asyncError) {
          console.error('Error loading user data from AsyncStorage:', asyncError);
        }
        
        // If not found, try the uid directly
        if (!uid) {
          try {
            const directUid = await AsyncStorage.getItem('uid');
            if (directUid) {
              uid = directUid;
              console.log('Chat context: User ID loaded from direct AsyncStorage uid:', uid);
            }
          } catch (directError) {
            console.error('Error loading direct uid from AsyncStorage:', directError);
          }
        }
        
        // If still not found, check currentUser in AsyncStorage
        if (!uid) {
          try {
            const currentUser = await AsyncStorage.getItem('currentUser');
            if (currentUser) {
              const parsedUser = JSON.parse(currentUser);
              if (parsedUser && parsedUser.uid) {
                uid = parsedUser.uid;
                console.log('Chat context: User ID loaded from currentUser in AsyncStorage:', uid);
              }
            }
          } catch (currentUserError) {
            console.error('Error loading currentUser from AsyncStorage:', currentUserError);
          }
        }
        
        if (!uid) {
          console.error('Failed to find user ID in any storage location');
          setLoadingConversations(false);
          return;
        }
        
        // Set the user ID in state
        setUserId(uid);
        
        // Try to get the user object for additional data
        let userObj: any = null;
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            userObj = JSON.parse(userData);
          }
        } catch (err) {
          console.error('Error parsing user data:', err);
        }
        
        // Get additional user profile data from Firestore if needed
        try {
          const userDoc = await firestore().collection('users').doc(uid).get();
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Use Firestore data if available, otherwise fall back to AsyncStorage data
            setUserName(userData?.displayName || 
                      (userObj ? userObj.displayName || userObj.email : null) || 
                      'User');
            
            // Set avatar if available in Firestore
            if (userData?.photoURL) {
              setUserAvatar(userData.photoURL);
            } else if (userObj && userObj.photoURL) {
              setUserAvatar(userObj.photoURL);
            }
          } else {
            // Fall back to AsyncStorage data
            setUserName((userObj ? userObj.displayName || userObj.email : null) || 'User');
            if (userObj && userObj.photoURL) {
              setUserAvatar(userObj.photoURL);
            }
          }
        } catch (firestoreError) {
          console.error('Error fetching user data from Firestore:', firestoreError);
          // Fall back to AsyncStorage data
          setUserName((userObj ? userObj.displayName || userObj.email : null) || 'User');
          if (userObj && userObj.photoURL) {
            setUserAvatar(userObj.photoURL);
          }
        }
        
        // Determine user type from stored role
        const role = await AsyncStorage.getItem('currentRole');
        setUserType(role === 'seller' ? ParticipantType.SELLER : ParticipantType.BUYER);
        
        console.log('Chat context user data loaded:', {
          uid,
          name: userName || (userObj ? userObj.displayName || userObj.email : null) || 'User',
          type: role === 'seller' ? 'SELLER' : 'BUYER',
          hasAvatar: !!((userObj && userObj.photoURL) || userAvatar)
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
          
          // Deep comparison function for important parts of conversations
          const hasConversationsChanged = (oldConvs: ChatConversation[], newConvs: ChatConversation[]) => {
            // Quick length check first
            if (oldConvs.length !== newConvs.length) return true;
            
            // Create a map of existing conversations by ID for fast lookup
            const existingConvsMap = new Map(
              oldConvs.map(conv => [conv.id, conv])
            );
            
            // Check each new conversation against the existing one
            for (const newConv of newConvs) {
              const existingConv = existingConvsMap.get(newConv.id);
              if (!existingConv) return true; // New conversation found
              
              // Compare important fields that would affect UI
              if (
                // Compare timestamps (updatedAt)
                (newConv.updatedAt !== existingConv.updatedAt) ||
                // Compare last messages
                (JSON.stringify(newConv.lastMessage) !== JSON.stringify(existingConv.lastMessage)) ||
                // Compare unread counts
                (JSON.stringify(newConv.unreadCount) !== JSON.stringify(existingConv.unreadCount))
              ) {
                return true;
              }
            }
            
            return false; // No significant changes
          };
          
          // Check if there's a meaningful difference
          const hasChanged = hasConversationsChanged(conversations, updatedConversations);
          
          // Initialize new total unread count
          let newTotal = 0;
          
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
            return id;
          };
          
          // Calculate total unread regardless - handling both normal and JSON string IDs
          const userIdStr = String(userId);
          const cleanUserId = extractUid(userIdStr);
          
          updatedConversations.forEach(conv => {
            if (conv.unreadCount) {
              // Check both the raw userId and the cleaned userId in unreadCount
              if (conv.unreadCount[userId]) {
                newTotal += conv.unreadCount[userId];
              } 
              
              // Also check for the cleaned ID version if it's different
              if (cleanUserId !== userId && conv.unreadCount[cleanUserId]) {
                newTotal += conv.unreadCount[cleanUserId];
              }
              
              // Check if any JSON string versions of this ID have unread counts
              Object.keys(conv.unreadCount).forEach(unreadKey => {
                if (extractUid(unreadKey) === cleanUserId && unreadKey !== userId && unreadKey !== cleanUserId) {
                  const count = conv.unreadCount?.[unreadKey];
                  if (count) {
                    newTotal += count;
                  }
                }
              });
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
      // Prevent loading if already loading to avoid concurrent requests
      if (loadingMessages) {
        console.log('Already loading messages, skipping duplicate request');
        return;
      }
      
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
      
      // Double check that this user is truly a participant in this conversation - with robust ID checking
      // First standardize the user ID for comparison
      const userIdStr = String(userId);
      
      // Create a helper function to extract uid from possible JSON string
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
      
      // Check participantIds array with safer string comparison
      const isInParticipantIds = conversation.participantIds?.some(id => {
        const extractedId = extractUid(String(id));
        return extractedId === userIdStr;
      });
      
      // Check participants array with safer string comparison
      const isInParticipants = conversation.participants?.some(p => {
        if (!p || !p.id) return false;
        const extractedId = extractUid(String(p.id));
        return extractedId === userIdStr;
      });
      
      const isAuthorized = isInParticipantIds || isInParticipants;
      
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
  }, [userId, loadingMessages]);
  
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
    
    // Try to repair any conversations with mismatched ID types
    try {
      // Attempt to repair conversations (only runs once per session)
      await chatService.repairConversations();
    } catch (repairError) {
      console.error('Error during conversation repair:', repairError);
      // Continue anyway since this is just a precaution
    }
    
    // Validate other participant
    if (!otherParticipant?.id) {
      console.error('Invalid other participant', otherParticipant);
      throw new Error('Other participant must have an ID');
    }
    
    // Handle JSON string IDs - extract uid if necessary
    let otherParticipantId = String(otherParticipant.id);
    if (otherParticipantId.startsWith('{') && otherParticipantId.endsWith('}') && otherParticipantId.includes('uid')) {
      try {
        const parsed = JSON.parse(otherParticipantId);
        if (parsed && parsed.uid) {
          console.log(`Extracted uid from JSON participant: ${otherParticipantId} -> ${parsed.uid}`);
          otherParticipantId = parsed.uid;
          // Update the original object too
          otherParticipant.id = parsed.uid;
        }
      } catch (e) {
        console.error(`Failed to parse JSON participant ID: ${otherParticipantId}`, e);
      }
    }
    
    // Log participant details for debugging
    console.log(`DEBUG: Creating/finding conversation between ${userId} and ${otherParticipantId}`)
    
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
