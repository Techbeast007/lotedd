'use client';

import { Center } from '@/components/ui/center';
import { HStack } from '@/components/ui/hstack';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useCart } from '@/services/context/CartContext';
import { Product, getFeaturedProducts } from '@/services/productService';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Cpu,
  Gavel,
  Package,
  PieChart,
  Shirt,
  ShoppingCart,
  Sofa,
  Tag,
  Truck,
  Utensils,
  Wrench
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

// Our value proposition items for B2B buyers
const valueProps = [
  { 
    id: '1', 
    title: 'Below-Cost Deals',
    description: 'Get products below manufacturing cost.',
    icon: Tag,
    color: '#3B82F6' // Blue
  },
  { 
    id: '2', 
    title: 'Bulk Discounts',
    description: 'Save more on larger quantities.',
    icon: Package,
    color: '#10B981' // Green
  },
  { 
    id: '3', 
    title: 'Premium Selection',
    description: 'Quality inventory across industries.',
    icon: Truck,
    color: '#F59E0B' // Amber
  },
  { 
    id: '4', 
    title: 'Bid Your Price',
    description: 'Name your price in our auction system.',
    icon: PieChart,
    color: '#8B5CF6' // Purple
  },
];

// B2B industry verticals
const industries = [
  { 
    id: '1', 
    name: 'Apparel & Fashion', 
    color: '#3B82F6', // Blue
    icon: 'shirt' 
  },
  { 
    id: '2', 
    name: 'Electronics', 
    color: '#10B981', // Green
    icon: 'cpu' 
  },
  { 
    id: '3', 
    name: 'Home & Furniture', 
    color: '#F59E0B', // Amber
    icon: 'sofa' 
  },
  { 
    id: '4', 
    name: 'Industrial Supplies', 
    color: '#8B5CF6', // Purple
    icon: 'tool' 
  },
  { 
    id: '5', 
    name: 'Food & Beverage', 
    color: '#EC4899', // Pink
    icon: 'utensils' 
  },
];

export default function BuyerHomeScreen() {
  const router = useRouter();
  const { addItem } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Fetch products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        
        // Get featured products (will be our showcase products)
        const featured = await getFeaturedProducts(8);
        setFeaturedProducts(featured || []);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);
  
  // Auto-scroll hero carousel
  useEffect(() => {
    const carouselInterval = setInterval(() => {
      if (valueProps.length > 0) {
        const nextIndex = (activeCarouselIndex + 1) % valueProps.length;
        carouselRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true
        });
        setActiveCarouselIndex(nextIndex);
      }
    }, 4000);

    return () => clearInterval(carouselInterval);
  }, [activeCarouselIndex]);

  const navigateToProduct = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  // Handle carousel scroll
  const onCarouselScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onCarouselViewableItemsChanged = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveCarouselIndex(viewableItems[0].index || 0);
    }
  };
  
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  // Render value proposition carousel items
  const renderValuePropItem = ({ item, index }: { item: typeof valueProps[0], index: number }) => {
    const Icon = item.icon;
    
    return (
      <View style={styles.valuePropSlide}>
        <LinearGradient
          colors={[item.color, `${item.color}DD`]}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={styles.valuePropGradient}
        >
          <View style={styles.valuePropContentContainer}>
            <View style={[styles.valuePropIconContainer, {backgroundColor: 'rgba(255,255,255,0.25)'}]}>
              <Icon size={32} color="#ffffff" strokeWidth={2.5} />
            </View>
            <Text style={styles.valuePropTitle}>{item.title}</Text>
            <Text style={styles.valuePropDescription}>{item.description}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.learnMoreButton}
            onPress={() => router.push('/(buyer)/shop')}
          >
            <Text style={styles.learnMoreText}>See Products</Text>
            <ArrowRight size={15} color="#fff" style={{ marginLeft: 6 }} strokeWidth={2.5} />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  // Carousel indicator dots
  const renderCarouselIndicator = () => {
    return (
      <View style={styles.indicatorContainer}>
        {valueProps.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1.2, 0.8],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={`indicator-${index}`}
              style={[
                styles.indicator,
                { opacity, transform: [{ scale }] },
                index === activeCarouselIndex && styles.activeIndicator,
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Render industry cards with Lucide icons instead of images
  const renderIndustryCard = ({ item }: { item: typeof industries[0] }) => {
    // Get the appropriate Lucide icon dynamically based on the icon name
    let IconComponent;
    
    switch (item.icon) {
      case 'shirt':
        IconComponent = Shirt;
        break;
      case 'cpu':
        IconComponent = Cpu;
        break;
      case 'sofa':
        IconComponent = Sofa;
        break;
      case 'tool':
        IconComponent = Wrench;
        break;
      case 'utensils':
        IconComponent = Utensils;
        break;
      default:
        IconComponent = Package;
    }
    
    return (
      <TouchableOpacity
        style={[styles.industryCard, { backgroundColor: item.color }]}
        onPress={() => router.push(`/(buyer)/shop?category=${item.id}`)}
      >
        <View style={styles.industryIconContainer}>
          <IconComponent size={48} color="#ffffff" />
        </View>
        <Text style={styles.industryName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  // Render featured product cards
  const renderFeaturedProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.featuredProductCard}
      onPress={() => navigateToProduct(item.id || '')}
    >
      <Image
        source={{ uri: item.featuredImage || 'https://via.placeholder.com/800x800?text=Product' }}
        style={styles.featuredProductImage}
      />
      
      <View style={styles.featuredProductInfo}>
        <Text style={styles.featuredProductName} numberOfLines={1}>
          {item.name}
        </Text>
        
        <HStack style={styles.featuredProductPriceContainer}>
          <Text style={styles.featuredProductPrice}>
            ₹{(item.discountPrice && item.discountPrice > 0) ? item.discountPrice : item.basePrice}
          </Text>
          {(item.discountPrice && item.discountPrice > 0 && item.basePrice > item.discountPrice) && (
            <Text style={styles.featuredProductOriginalPrice}>
              ₹{item.basePrice}
            </Text>
          )}
        </HStack>
        
        <View style={styles.savingsContainer}>
          {(item.discountPrice && item.basePrice > item.discountPrice) && (
            <Text style={styles.savingsText}>
              {Math.round(((item.basePrice - item.discountPrice) / item.basePrice) * 100)}% below cost
            </Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.quickAddButton}
        onPress={(e) => {
          e.stopPropagation();
          addItem(item);
        }}
      >
        <ShoppingCart size={18} color="#ffffff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container]}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#1a365d', '#2d3748']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContentContainer}>
              <Text style={styles.heroTagline}>Source Inventory at Below-Cost Prices</Text>
              <Text style={styles.heroSubtitle}>
                Premium B2B marketplace for buying quality products at incredible discounts
              </Text>
              
              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => router.push('/(buyer)/shop')}
              >
                <Text style={styles.heroButtonText}>Explore Marketplace</Text>
                <ArrowRight size={20} color="#1a365d" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
        
        {/* Value Proposition Carousel */}
        <View style={styles.carouselSection}>
          <Text style={styles.sectionTitle}>Benefits for Buyers</Text>
          
          <FlatList
            ref={carouselRef}
            data={valueProps}
            renderItem={renderValuePropItem}
            keyExtractor={(item) => `value-prop-${item.id}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onCarouselScroll}
            onViewableItemsChanged={onCarouselViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            scrollEventThrottle={16}
          />
          
          {renderCarouselIndicator()}
        </View>
        
        {/* Industries Section */}
        <View style={styles.industriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse By Industry</Text>
            <TouchableOpacity onPress={() => router.push('/(buyer)/shop')}>
              <HStack style={styles.seeAllContainer}>
                <Text style={styles.seeAllText}>See All</Text>
                <ArrowRight size={16} color="#3B82F6" />
              </HStack>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={industries}
            renderItem={renderIndustryCard}
            keyExtractor={(item) => `industry-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.industriesListContainer}
          />
        </View>
        
        {/* Bidding Section */}
        <View style={styles.biddingSection}>
          <TouchableOpacity
            style={styles.biddingCard}
            onPress={() => router.push('/(buyer)/bids')}
          >
            <LinearGradient
              colors={['#4C1D95', '#7C3AED']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.biddingGradient}
            >
              <View style={styles.biddingContentRow}>
                <View style={styles.biddingTextContainer}>
                  <Text style={styles.biddingTitle}>Live Bidding</Text>
                  <Text style={styles.biddingSubtitle}>
                    Name your price on bulk inventory deals
                  </Text>
                  <View style={styles.biddingCTA}>
                    <Text style={styles.biddingCTAText}>Start Bidding</Text>
                    <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
                  </View>
                </View>
                
                <View style={styles.biddingIconContainer}>
                  <Gavel size={48} color="#ffffff" style={{ opacity: 0.95 }} strokeWidth={2} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Featured Deals */}
        <View style={styles.dealsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Below-Cost Deals</Text>
            <TouchableOpacity onPress={() => router.push('/(buyer)/shop?deals=true')}>
              <HStack style={styles.seeAllContainer}>
                <Text style={styles.seeAllText}>See All</Text>
                <ArrowRight size={16} color="#3B82F6" />
              </HStack>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <Center style={styles.loadingContainer}>
              <Spinner size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Finding the best deals...</Text>
            </Center>
          ) : featuredProducts.length > 0 ? (
            <FlatList
              data={featuredProducts}
              renderItem={renderFeaturedProductCard}
              keyExtractor={(item) => `deal-${item.id || Math.random().toString()}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dealsListContainer}
            />
          ) : (
            <Center style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>Check back soon for fresh deals!</Text>
            </Center>
          )}
        </View>
        
        {/* Call to Action */}
        <TouchableOpacity 
          style={styles.ctaContainer}
          onPress={() => router.push('/(buyer)/shop')} // Navigate directly to shop
        >
          <LinearGradient
            colors={['#1a365d', '#2d3748']}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>Ready to find amazing deals?</Text>
            <Text style={styles.ctaDescription}>
              Join thousands of businesses sourcing inventory at below-market prices.
            </Text>
            <View style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Browse All Products</Text>
              <ArrowRight size={18} color="#1a365d" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* About Platform */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>About Our B2B Platform</Text>
          <Text style={styles.aboutDescription}>
            We connect buyers like you with quality inventory at below-market prices.
            Our platform gives you access to exclusive deals on premium products, overstock items,
            and bulk purchasing opportunities across multiple industries.
          </Text>
          
          <View style={styles.statContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>5000+</Text>
              <Text style={styles.statLabel}>Happy Buyers</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>₹50Cr+</Text>
              <Text style={styles.statLabel}>Savings Generated</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>15+</Text>
              <Text style={styles.statLabel}>Industries</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    height: 380,
    marginBottom: 26,
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroGradient: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    padding: 0,
  },
  heroContentContainer: {
    padding: 28,
    paddingTop: 50,
    backgroundColor: 'rgba(0,0,0,0.25)',
    height: '100%',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 16,
  },
  heroTagline: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
    maxWidth: '90%',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
    lineHeight: 44,
  },
  heroSubtitle: {
    fontSize: 17,
    color: '#E2E8F0',
    marginBottom: 34,
    maxWidth: '85%',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a365d',
  },
  carouselSection: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 18,
    paddingHorizontal: 20,
    letterSpacing: 0.3,
  },
  valuePropSlide: {
    width: width,
    paddingHorizontal: 20,
  },
  valuePropGradient: {
    borderRadius: 18,
    padding: 24,
    height: 240,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  valuePropContentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  valuePropIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  valuePropTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  valuePropDescription: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 0,
    lineHeight: 20,
    opacity: 0.9,
    maxWidth: '95%',
    letterSpacing: 0.2,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  learnMoreText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 4,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E0',
    marginHorizontal: 5,
    opacity: 0.6,
  },
  activeIndicator: {
    backgroundColor: '#3B82F6',
    width: 22,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  industriesSection: {
    marginBottom: 25,
  },
  biddingSection: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  biddingCard: {
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  biddingGradient: {
    padding: 26,
  },
  biddingContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  biddingTextContainer: {
    flex: 1,
    paddingRight: 20,
  },
  biddingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    letterSpacing: 0.4,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  biddingSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 18,
    lineHeight: 20,
    maxWidth: '95%',
  },
  biddingCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 4,
  },
  biddingCTAText: {
    color: '#ffffff',
    fontWeight: '700',
    marginRight: 8,
    fontSize: 15,
  },
  biddingIconContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 45,
  },
  biddingIcon: {
    width: 70,
    height: 70,
    tintColor: 'rgba(255,255,255,0.9)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  seeAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  industriesListContainer: {
    paddingHorizontal: 20,
    paddingRight: 10,
    gap: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
  industryCard: {
    width: 130,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  industryIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  industryName: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dealsSection: {
    marginBottom: 30,
  },
  dealsListContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featuredProductCard: {
    width: 190,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  featuredProductImage: {
    width: '100%',
    height: 190,
    resizeMode: 'cover',
  },
  featuredProductInfo: {
    padding: 14,
    paddingBottom: 16,
  },
  featuredProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 6,
  },
  featuredProductPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  featuredProductPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  featuredProductOriginalPrice: {
    fontSize: 14,
    color: '#A0AEC0',
    textDecorationLine: 'line-through',
  },
  savingsContainer: {
    marginTop: 4,
  },
  savingsText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  quickAddButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  loadingContainer: {
    height: 200,
  },
  loadingText: {
    marginTop: 8,
    color: '#718096',
  },
  emptyStateContainer: {
    height: 200,
  },
  emptyStateText: {
    color: '#718096',
    fontSize: 16,
  },
  ctaContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: 24,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  ctaDescription: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 16,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
  },
  aboutSection: {
    paddingHorizontal: 20,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 20,
  },
  statContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  }
});