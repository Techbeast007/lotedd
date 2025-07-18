import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import firestore from '@react-native-firebase/firestore';
import { isFirebaseInitialized } from './firebaseService';

// Chat participant types
export enum ParticipantType {
  BUYER = 'buyer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

// Message structure
export interface Message {
  id?: string;
  text: string;
  createdAt: Date | FirebaseFirestoreTypes.Timestamp;
  senderId: string;
  senderName: string;
  senderType: ParticipantType;
  senderAvatar?: string;
  read: boolean;
  images?: string[];
  attachments?: {
    type: 'image' | 'document' | 'product';
    url: string;
    name: string;
    size?: number;
  }[];
}

// Chat conversation structure
export interface ChatConversation {
  id?: string;
  participants: {
    id: string;
    name: string;
    type: ParticipantType;
    avatar?: string;
  }[];
  // Array of participant IDs for easier querying
  participantIds?: string[];
  lastMessage?: {
    text: string;
    createdAt: Date | FirebaseFirestoreTypes.Timestamp;
    senderId: string;
  };
  unreadCount?: {
    [participantId: string]: number;
  };
  createdAt: Date | FirebaseFirestoreTypes.Timestamp;
  updatedAt: Date | FirebaseFirestoreTypes.Timestamp;
  relatedTo?: {
    type: 'order' | 'product' | 'general';
    id?: string;
    name?: string;
  };
}

class ChatService {
  // Get all conversations for a user
  async getConversations(userId: string): Promise<ChatConversation[]> {
    try {
      // Return empty array if no userId or Firebase not initialized
      if (!userId || !isFirebaseInitialized()) {
        console.log('Firebase not initialized or no userId provided');
        return [];
      }
      
      console.log(`Fetching conversations for user: ${userId}`);
      
      // Use 'participantIds' array-contains query for efficiency
      const conversationsRef = firestore()
        .collection('conversations')
        .where('participantIds', 'array-contains', userId);
      
      const snapshot = await conversationsRef.get();
      
      if (snapshot.empty) {
        console.log('No conversations found for user');
        return [];
      }
      
      console.log(`Found ${snapshot.docs.length} conversations for user`);
      
      // Filter conversations to ensure they contain the current user as a participant
      return snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as ChatConversation)
        .filter(conversation => {
          // Double-check that this conversation truly includes the current user
          return conversation.participantIds?.includes(userId) || 
                 conversation.participants?.some(p => p.id === userId);
        });
      
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }
  
  // Get a single conversation by ID - with strict user authorization check
  async getConversationById(conversationId: string, userId?: string): Promise<ChatConversation | null> {
    try {
      if (!conversationId || !isFirebaseInitialized()) {
        console.log('Firebase not initialized or no conversationId provided');
        return null;
      }
      
      console.log(`Fetching conversation: ${conversationId}`);
      
      const conversationDoc = await firestore()
        .collection('conversations')
        .doc(conversationId)
        .get();
      
      if (!conversationDoc.exists) {
        console.log('Conversation not found');
        return null;
      }
      
      // If userId is provided, verify this user is a participant
      if (userId) {
        const data = conversationDoc.data();
        if (!data || !data.participantIds || !data.participantIds.includes(userId)) {
          console.warn(`Access denied: User ${userId} is not a participant in conversation ${conversationId}`);
          return null; // User is not authorized to view this conversation
        }
      }
      
      return {
        id: conversationDoc.id,
        ...conversationDoc.data()
      } as ChatConversation;
      
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }
  
  // Find or create a conversation between users
  async findOrCreateConversation(
    participants: {
      id: string;
      name: string;
      type: ParticipantType;
      avatar?: string;
    }[],
    relatedTo?: {
      type: 'order' | 'product' | 'general';
      id?: string;
      name?: string;
    }
  ): Promise<string> {
    try {
      if (!isFirebaseInitialized()) {
        console.error('Firebase not initialized');
        throw new Error('Firebase not initialized');
      }
      
      // Validate required fields and sanitize data
      if (!participants || !Array.isArray(participants) || participants.length < 2) {
        console.error('Invalid participants array');
        throw new Error('Invalid participants data');
      }
      
      // Extra validation: check for any undefined/null values in participants
      for (const p of participants) {
        if (!p.id || !p.name || !p.type) {
          console.error('Participant has undefined/null required field:', p);
          throw new Error('Invalid participant data: missing required fields');
        }
      }
      
      // Clean participants data - make a copy to avoid modifying the original
      const sanitizedParticipants = participants.map(p => {
        // Create a new object with only the fields we want
        const cleanP: {
          id: string;
          name: string;
          type: ParticipantType;
          avatar?: string;
        } = {
          id: p.id || '',  // Ensure ID is never undefined
          name: p.name || 'Unknown',  // Ensure name is never undefined
          type: p.type,
        };
        
        // Only add avatar if it's defined and not empty
        if (p.avatar) {
          cleanP.avatar = p.avatar;
        }
        
        return cleanP;
      });
      
      // Sort participant IDs for consistent querying
      const participantIds = sanitizedParticipants.map(p => p.id).filter(id => id).sort();
      
      if (participantIds.length < 2) {
        console.error('Not enough valid participant IDs');
        throw new Error('Invalid participant IDs');
      }
      
      // Check if conversation already exists
      const existingConversations = await firestore()
        .collection('conversations')
        .where('participantIds', '==', participantIds)
        .get();
      
      if (!existingConversations.empty) {
        return existingConversations.docs[0].id;
      }
      
      // Create new conversation
      const now = firestore.Timestamp.now();
      
      const newConversation: ChatConversation = {
        participants: sanitizedParticipants,
        createdAt: now,
        updatedAt: now,
        unreadCount: {},
      };
      
      // Sanitize relatedTo object if present
      if (relatedTo) {
        // Extra validation for relatedTo
        if (relatedTo.type === undefined || relatedTo.type === null) {
          console.error('RelatedTo has undefined/null type field:', relatedTo);
          throw new Error('Invalid relatedTo data: missing type field');
        }
        
        newConversation.relatedTo = {
          type: relatedTo.type,
          id: relatedTo.id || '',  // Ensure ID is never undefined
          name: relatedTo.name || '',  // Ensure name is never undefined
        };
      }
      
      // Add participantIds array for easier querying
      const conversationData = {
        ...newConversation,
        participantIds,
      };
      
      const newConversationRef = await firestore()
        .collection('conversations')
        .add(conversationData);
      
      return newConversationRef.id;
      
    } catch (error) {
      console.error('Error finding or creating conversation:', error);
      throw error;
    }
  }
  
  // Send a message in a conversation
  async sendMessage(
    conversationId: string,
    message: Omit<Message, 'id' | 'createdAt' | 'read'>
  ): Promise<string> {
    try {
      const now = firestore.Timestamp.now();
      
      // Validate required fields
      if (!message.text || !message.senderId || !message.senderName || !message.senderType) {
        console.error('Message missing required fields:', message);
        throw new Error('Message missing required fields');
      }
      
      // Create a clean message object with no undefined fields
      const messageData: Message = {
        text: message.text,
        senderId: message.senderId,
        senderName: message.senderName,
        senderType: message.senderType,
        createdAt: now,
        read: false,
      };
      
      // Only add optional fields if they exist
      if (message.senderAvatar) {
        messageData.senderAvatar = message.senderAvatar;
      }
      
      if (message.attachments && message.attachments.length > 0) {
        // Validate each attachment
        messageData.attachments = message.attachments.map(attachment => ({
          type: attachment.type,
          url: attachment.url,
          name: attachment.name,
          ...(attachment.size ? { size: attachment.size } : {})
        }));
      }
      
      // Add message to the messages subcollection
      const newMessageRef = await firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add(messageData);
      
      // Get the conversation to access the participants
      const conversationDoc = await firestore()
        .collection('conversations')
        .doc(conversationId)
        .get();
        
      if (!conversationDoc.exists) {
        throw new Error('Conversation not found');
      }
      
      const conversationData = conversationDoc.data() as ChatConversation;
      
      // Update conversation with last message - only use the required fields
      const updateData: any = {
        lastMessage: {
          text: message.text,
          createdAt: now,
          senderId: message.senderId,
        },
        updatedAt: now,
      };
      
      // Calculate unread counts for all participants except the sender
      if (conversationData.participants) {
        // Increment unread count for all participants except the sender
        conversationData.participants.forEach(participant => {
          if (participant.id !== message.senderId) {
            // Initialize if not exists, otherwise increment
            updateData[`unreadCount.${participant.id}`] = 
              firestore.FieldValue.increment(1);
          }
        });
      }
      
      await firestore()
        .collection('conversations')
        .doc(conversationId)
        .update(updateData);
      
      return newMessageRef.id;
      
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
  
  // Get messages for a conversation with pagination - with user authorization check
  async getMessages(
    conversationId: string,
    limit: number = 20,
    startAfter?: FirebaseFirestoreTypes.DocumentSnapshot,
    userId?: string
  ): Promise<{ messages: Message[]; lastVisible: FirebaseFirestoreTypes.DocumentSnapshot | null }> {
    try {
      // First verify the user is a participant in this conversation if userId is provided
      if (userId) {
        const conversationDoc = await firestore()
          .collection('conversations')
          .doc(conversationId)
          .get();
          
        if (!conversationDoc.exists) {
          console.log('Conversation not found when getting messages');
          return { messages: [], lastVisible: null };
        }
        
        // Check if this user is a participant
        const data = conversationDoc.data();
        if (!data || !data.participantIds || !data.participantIds.includes(userId)) {
          console.warn(`Access denied: User ${userId} is not a participant in conversation ${conversationId}`);
          return { messages: [], lastVisible: null }; // User is not authorized
        }
      }
      
      // User is authorized or no userId check was requested, proceed with query
      console.log(`Fetching messages for conversation: ${conversationId}`);
      
      let query = firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(limit);
      
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        console.log('No messages found for conversation');
        return { messages: [], lastVisible: null };
      }
      
      console.log(`Found ${snapshot.docs.length} messages`);
      
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      return {
        messages,
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
      };
      
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }
  
  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const batch = firestore().batch();
      
      // Get unread messages
      const unreadMessages = await firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .where('read', '==', false)
        .where('senderId', '!=', userId)
        .get();
      
      // Mark each message as read
      unreadMessages.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      
      // Reset unread count for the user
      batch.update(
        firestore().collection('conversations').doc(conversationId),
        { [`unreadCount.${userId}`]: 0 }
      );
      
      await batch.commit();
      
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }
  
  // Get total unread message count across all conversations
  async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const conversations = await this.getConversations(userId);
      
      let totalUnread = 0;
      conversations.forEach(conversation => {
        if (conversation.unreadCount && conversation.unreadCount[userId]) {
          totalUnread += conversation.unreadCount[userId];
        }
      });
      
      return totalUnread;
      
    } catch (error) {
      console.error('Error getting total unread count:', error);
      throw error;
    }
  }
  
  // Subscribe to new messages in a conversation - with user authorization check
  async subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void,
    userId?: string
  ): Promise<() => void> {
    // First verify the user is a participant if userId is provided
    if (userId) {
      try {
        const conversationDoc = await firestore()
          .collection('conversations')
          .doc(conversationId)
          .get();
          
        if (!conversationDoc.exists) {
          console.log('Conversation not found when subscribing to messages');
          callback([]);
          return () => {}; // Return a no-op cleanup function
        }
        
        // Check if this user is a participant
        const data = conversationDoc.data();
        if (!data || !data.participantIds || !data.participantIds.includes(userId)) {
          console.warn(`Access denied: User ${userId} is not a participant in conversation ${conversationId}`);
          callback([]);
          return () => {}; // Return a no-op cleanup function
        }
        
        console.log(`User ${userId} authorized to subscribe to conversation ${conversationId}`);
      } catch (error) {
        console.error('Error checking conversation authorization:', error);
        callback([]);
        return () => {}; // Return a no-op cleanup function
      }
    }
    
    console.log(`Subscribing to messages for conversation: ${conversationId}`);
    
    // User is authorized or no userId check was requested, proceed with subscription
    const unsubscribe = firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .onSnapshot(
        snapshot => {
          if (!snapshot.empty) {
            const messages = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Message[];
            callback(messages);
            console.log(`Received ${messages.length} messages in subscription update`);
          } else {
            console.log('No messages in subscription update');
          }
        },
        error => {
          console.error('Error subscribing to messages:', error);
        }
      );
    
    return unsubscribe;
  }
  
  // Subscribe to conversation updates - with user authorization check
  async subscribeToConversation(
    conversationId: string,
    callback: (conversation: ChatConversation | null) => void,
    userId?: string
  ): Promise<() => void> {
    // First verify the user is a participant if userId is provided
    if (userId) {
      try {
        const conversationDoc = await firestore()
          .collection('conversations')
          .doc(conversationId)
          .get();
          
        if (!conversationDoc.exists) {
          console.log('Conversation not found when subscribing');
          callback(null);
          return () => {}; // Return a no-op cleanup function
        }
        
        // Check if this user is a participant
        const data = conversationDoc.data();
        if (!data || !data.participantIds || !data.participantIds.includes(userId)) {
          console.warn(`Access denied: User ${userId} is not a participant in conversation ${conversationId}`);
          callback(null);
          return () => {}; // Return a no-op cleanup function
        }
        
        console.log(`User ${userId} authorized to subscribe to conversation ${conversationId}`);
      } catch (error) {
        console.error('Error checking conversation authorization:', error);
        callback(null);
        return () => {}; // Return a no-op cleanup function
      }
    }
    
    console.log(`Subscribing to conversation updates: ${conversationId}`);
    
    // User is authorized or no userId check was requested, proceed with subscription
    const unsubscribe = firestore()
      .collection('conversations')
      .doc(conversationId)
      .onSnapshot(
        snapshot => {
          if (snapshot.exists()) {
            const conversation = {
              id: snapshot.id,
              ...snapshot.data()
            } as ChatConversation;
            
            // Double-check authorization in the subscription callback as well
            if (userId) {
              // Check if user is in participants array
              const userIsParticipant = conversation.participants?.some(p => p.id === userId);
              // Also check participantIds if it exists (it's in the data but not in our type)
              const userIsInParticipantIds = (conversation as any).participantIds?.includes(userId);
              
              if (!userIsParticipant && !userIsInParticipantIds) {
                console.warn(`Subscription access denied: User ${userId} is not a participant in conversation ${conversationId}`);
                callback(null);
                return;
              }
            }
            
            callback(conversation);
          } else {
            callback(null);
          }
        },
        error => {
          console.error('Error subscribing to conversation:', error);
          callback(null);
        }
      );
    
    return unsubscribe;
  }
  
  // Subscribe to all conversations for a user
  subscribeToConversations(
    userId: string,
    callback: (conversations: ChatConversation[]) => void
  ): () => void {
    if (!userId || !isFirebaseInitialized()) {
      console.log('Firebase not initialized or no userId provided');
      callback([]);
      // Return a no-op cleanup function
      return () => {};
    }
    
    const unsubscribe = firestore()
      .collection('conversations')
      .where('participantIds', 'array-contains', userId)
      .orderBy('updatedAt', 'desc')
      .onSnapshot(
        snapshot => {
          if (!snapshot.empty) {
            const conversations = snapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data()
              }) as ChatConversation)
              // Extra safety filter to ensure conversations belong to this user
              .filter(conversation => {
                return conversation.participantIds?.includes(userId) || 
                      conversation.participants?.some(p => p.id === userId);
              });
            callback(conversations);
          } else {
            callback([]);
          }
        },
        error => {
          console.error('Error subscribing to conversations:', error);
          callback([]);
        }
      );
    
    return unsubscribe;
  }
  
  // Delete a message
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      await firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId)
        .delete();
      
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
export default chatService;
