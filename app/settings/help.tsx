'use client';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, FileText, HelpCircle, Mail, MessageSquare, Phone } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface FAQ {
  question: string;
  answer: string;
  isOpen: boolean;
}

export default function HelpFAQScreen() {
  const router = useRouter();
  
  // FAQ state
  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      question: 'How do I track my order?',
      answer: 'You can track your order by going to the "Orders" section in your profile. Click on any order to view its current status and tracking information. You will also receive email and push notifications with updates on your order status.',
      isOpen: false,
    },
    {
      question: 'How can I return a product?',
      answer: 'To return a product, go to the "Orders" section, select the order containing the item you want to return, and click "Return Item". Follow the instructions to print a return label and send the product back. Returns must be initiated within 30 days of delivery.',
      isOpen: false,
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept various payment methods including credit/debit cards (Visa, Mastercard, American Express), UPI, net banking, and cash on delivery (COD) for eligible orders. You can manage your payment methods in the "Payment Methods" section of your profile.',
      isOpen: false,
    },
    {
      question: 'How do I change my delivery address?',
      answer: 'You can change your delivery address by going to "Profile" > "Addresses". You can add multiple addresses and set one as your default. During checkout, you can also select a different address for that specific order.',
      isOpen: false,
    },
    {
      question: 'Can I cancel my order?',
      answer: 'Yes, you can cancel your order as long as it has not been shipped. Go to "Orders", select the order you want to cancel, and click "Cancel Order". Once an order has been shipped, you will need to wait for delivery and then initiate a return.',
      isOpen: false,
    },
    {
      question: 'How do I contact customer support?',
      answer: 'You can contact our customer support team via live chat, email at support@lotwaala.com, or by calling our toll-free number 1-800-LOTWAALA. Our support team is available from 9:00 AM to 8:00 PM, seven days a week.',
      isOpen: false,
    },
  ]);

  // Toggle FAQ open/closed
  const toggleFAQ = (index: number) => {
    setFaqs(prevFaqs => 
      prevFaqs.map((faq, i) => 
        i === index ? { ...faq, isOpen: !faq.isOpen } : faq
      )
    );
  };

  // Contact methods
  const contactMethods = [
    {
      icon: <MessageSquare size={20} color="#3B82F6" />,
      title: 'Live Chat',
      description: 'Chat with our support team',
      action: () => Alert.alert('Live Chat', 'This would open a chat with support in a real app.'),
    },
    {
      icon: <Mail size={20} color="#3B82F6" />,
      title: 'Email Support',
      description: 'support@lotwaala.com',
      action: () => Linking.openURL('mailto:support@lotwaala.com'),
    },
    {
      icon: <Phone size={20} color="#3B82F6" />,
      title: 'Call Us',
      description: '1-800-LOTWAALA',
      action: () => Linking.openURL('tel:18005689225'),
    },
    {
      icon: <FileText size={20} color="#3B82F6" />,
      title: 'Help Center',
      description: 'Browse all articles',
      action: () => Alert.alert('Help Center', 'This would open a knowledge base in a real app.'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Heading style={styles.headerTitle}>Help & FAQ</Heading>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Support Section */}
        <Box style={styles.supportSection}>
          <HelpCircle size={36} color="#3B82F6" style={styles.supportIcon} />
          <Heading size="md" style={styles.supportTitle}>How can we help you?</Heading>
          <Text style={styles.supportText}>
            Get quick assistance through any of our support channels.
          </Text>
          
          <View style={styles.contactCards}>
            {contactMethods.map((method, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.contactCard}
                onPress={method.action}
              >
                <View style={styles.contactIcon}>{method.icon}</View>
                <Text style={styles.contactTitle}>{method.title}</Text>
                <Text style={styles.contactDesc}>{method.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Box>
        
        <Divider style={styles.divider} />
        
        {/* FAQ Section */}
        <Box style={styles.faqSection}>
          <Heading size="md" style={styles.faqTitle}>Frequently Asked Questions</Heading>
          
          {faqs.map((faq, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.faqItem}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                {faq.isOpen ? 
                  <ChevronUp size={20} color="#64748B" /> : 
                  <ChevronDown size={20} color="#64748B" />
                }
              </View>
              
              {faq.isOpen && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </Box>
        
        {/* Still need help section */}
        <Box style={styles.needHelpSection}>
          <VStack space="md" alignItems="center">
            <Heading size="sm" style={styles.needHelpTitle}>Still have questions?</Heading>
            <Text style={styles.needHelpText}>
              Can't find what you're looking for? Contact our support team for further assistance.
            </Text>
            <Button
              variant="solid"
              style={styles.contactButton}
              onPress={() => Linking.openURL('mailto:support@lotwaala.com')}
            >
              <ButtonText>Contact Support</ButtonText>
            </Button>
          </VStack>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  content: {
    flex: 1,
  },
  supportSection: {
    padding: 20,
    alignItems: 'center',
  },
  supportIcon: {
    marginBottom: 16,
  },
  supportTitle: {
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  supportText: {
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  contactCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  contactCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  contactDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  divider: {
    backgroundColor: '#E2E8F0',
    height: 8,
    marginVertical: 8,
  },
  faqSection: {
    padding: 20,
  },
  faqTitle: {
    color: '#0F172A',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    lineHeight: 20,
  },
  needHelpSection: {
    padding: 20,
    marginBottom: 24,
  },
  needHelpTitle: {
    color: '#0F172A',
  },
  needHelpText: {
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  contactButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
  },
});
