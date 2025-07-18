import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, FileText, Mail, MessageSquare, Phone } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface FAQ {
  question: string;
  answer: string;
  isOpen: boolean;
}

export default function SellerHelpScreen() {
  const router = useRouter();
  
  // FAQ state for sellers
  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      question: 'How do I add new products?',
      answer: 'You can add new products by going to your seller dashboard and clicking on the "Add Product" button. Fill in all the required details including product name, description, price, inventory, and images. Make sure to provide accurate information to improve product visibility.',
      isOpen: false,
    },
    {
      question: 'How do I track my orders?',
      answer: 'You can track your orders by going to the "Orders" section in your seller dashboard. Here, you will see all the orders that have been placed for your products. You can update the status of each order as it progresses through fulfillment.',
      isOpen: false,
    },
    {
      question: 'How do I handle returns and refunds?',
      answer: 'When a customer initiates a return, you will receive a notification. Go to the "Returns" section in your dashboard to see the details. Follow the return policy guidelines to process the return and issue a refund if necessary.',
      isOpen: false,
    },
    {
      question: 'How can I improve my product visibility?',
      answer: 'To improve your product visibility, ensure you have high-quality product images, detailed and accurate product descriptions, competitive pricing, and prompt responses to customer inquiries. Regularly update your inventory and maintain good seller ratings.',
      isOpen: false,
    },
    {
      question: 'How do I get paid?',
      answer: 'Payments are processed automatically based on your chosen payment schedule (weekly, bi-weekly, or monthly). Make sure your bank account details are correctly set up in the "Payments" section of your seller dashboard.',
      isOpen: false,
    },
    {
      question: 'What are the selling fees?',
      answer: 'Selling fees vary by product category. Generally, there is a small percentage commission on each sale plus any applicable payment processing fees. You can view the detailed fee structure in the "Fees & Pricing" section of your seller dashboard.',
      isOpen: false,
    },
  ]);

  // Toggle FAQ open/close state
  const toggleFAQ = (index: number) => {
    const newFaqs = [...faqs];
    newFaqs[index].isOpen = !newFaqs[index].isOpen;
    setFaqs(newFaqs);
  };
  
  // Handle support contact actions
  const handleContact = (type: 'email' | 'phone' | 'chat') => {
    switch (type) {
      case 'email':
        Linking.openURL('mailto:seller-support@lotedd.com');
        break;
      case 'phone':
        Linking.openURL('tel:+918000123456');
        break;
      case 'chat':
        Alert.alert(
          'Live Chat Support',
          'Would you like to start a live chat with our seller support team?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Start Chat',
              onPress: () => router.push('/messages'), // Redirect to messages with support chat
            },
          ]
        );
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Box style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Heading size="xl" style={styles.headerTitle}>Help & Support</Heading>
        <View style={styles.placeholder} />
      </Box>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Cards */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Box style={styles.contactCardsContainer}>
          {/* Email Support */}
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => handleContact('email')}
          >
            <Box style={[styles.iconContainer, { backgroundColor: '#EBF5FF' }]}>
              <Mail size={24} color="#3B82F6" />
            </Box>
            <VStack style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactDescription}>seller-support@lotedd.com</Text>
              <Text style={styles.responseTime}>Response within 24 hours</Text>
            </VStack>
          </TouchableOpacity>
          
          {/* Phone Support */}
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => handleContact('phone')}
          >
            <Box style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
              <Phone size={24} color="#16A34A" />
            </Box>
            <VStack style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Call Us</Text>
              <Text style={styles.contactDescription}>+91 8000 123 456</Text>
              <Text style={styles.responseTime}>Available 9 AM - 6 PM IST</Text>
            </VStack>
          </TouchableOpacity>
          
          {/* Live Chat */}
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => handleContact('chat')}
          >
            <Box style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <MessageSquare size={24} color="#4F46E5" />
            </Box>
            <VStack style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Live Chat</Text>
              <Text style={styles.contactDescription}>Chat with our support team</Text>
              <Text style={styles.responseTime}>Typically replies in minutes</Text>
            </VStack>
          </TouchableOpacity>
        </Box>
        
        {/* FAQ Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Frequently Asked Questions</Text>
        <Box style={styles.faqContainer}>
          {faqs.map((faq, index) => (
            <Box key={`faq-${index}`} style={styles.faqItem}>
              <TouchableOpacity 
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(index)}
              >
                <Text style={styles.questionText}>{faq.question}</Text>
                {faq.isOpen ? (
                  <ChevronUp size={20} color="#64748B" />
                ) : (
                  <ChevronDown size={20} color="#64748B" />
                )}
              </TouchableOpacity>
              
              {faq.isOpen && (
                <Box style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{faq.answer}</Text>
                </Box>
              )}
              
              {index < faqs.length - 1 && <Divider style={styles.faqDivider} />}
            </Box>
          ))}
        </Box>
        
        {/* Resources Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Seller Resources</Text>
        <Box style={styles.resourcesContainer}>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Alert.alert('Seller Guide', 'This would open the seller guide in a real app')}
          >
            <Box style={[styles.resourceIconContainer, { backgroundColor: '#EEF2FF' }]}>
              <FileText size={24} color="#4F46E5" />
            </Box>
            <VStack style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Seller Guide</Text>
              <Text style={styles.resourceDescription}>
                Comprehensive guide for sellers
              </Text>
            </VStack>
            <ArrowLeft size={20} color="#64748B" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          
          <Divider style={styles.resourceDivider} />
          
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Alert.alert('Policies', 'This would open seller policies in a real app')}
          >
            <Box style={[styles.resourceIconContainer, { backgroundColor: '#F0F9FF' }]}>
              <FileText size={24} color="#0284C7" />
            </Box>
            <VStack style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Seller Policies</Text>
              <Text style={styles.resourceDescription}>
                Terms, conditions, and policies
              </Text>
            </VStack>
            <ArrowLeft size={20} color="#64748B" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          
          <Divider style={styles.resourceDivider} />
          
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Alert.alert('Training', 'This would open seller training in a real app')}
          >
            <Box style={[styles.resourceIconContainer, { backgroundColor: '#FFF7ED' }]}>
              <FileText size={24} color="#EA580C" />
            </Box>
            <VStack style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Seller Training</Text>
              <Text style={styles.resourceDescription}>
                Videos and tutorials to get started
              </Text>
            </VStack>
            <ArrowLeft size={20} color="#64748B" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </Box>
        
        {/* Add some space at the bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  contactCardsContainer: {
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  responseTime: {
    fontSize: 12,
    color: '#64748B',
  },
  faqContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  faqItem: {
    paddingHorizontal: 16,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: {
    paddingBottom: 16,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#334155',
  },
  faqDivider: {
    backgroundColor: '#E2E8F0',
  },
  resourcesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  resourceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 13,
    color: '#64748B',
  },
  resourceDivider: {
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
});
