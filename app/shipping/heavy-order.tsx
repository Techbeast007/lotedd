import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { Box } from '../../components/ui/box';
import { Button } from '../../components/ui/button';
import { FormControl } from '../../components/ui/form-control';
import { HStack } from '../../components/ui/hstack';
import { Input } from '../../components/ui/input';
import { Select, SelectItem } from '../../components/ui/select';
import { VStack } from '../../components/ui/vstack';
import { useBigShip } from '../../hooks/useBigShip';
import { useRazorpay } from '../../hooks/useRazorpay';
import { BoxDetail, Courier, PaymentType, RiskType, ShipmentCategory } from '../../services/bigshipService';
import { createPayment, saveOrderDetails, updateOrder } from '../../services/orderService';

// Types for form state
interface HeavyOrderForm {
  // Customer details
  firstName: string;
  lastName: string;
  companyName: string;
  contactNumber: string;
  email: string;
  
  // Address details
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
  
  // Order details
  invoiceId: string;
  totalAmount: number;
  advanceAmount: number;
  codAmount: number;
  
  // Product details
  products: {
    name: string;
    category: string;
    quantity: number;
    weight: number;
    length: number;
    width: number;
    height: number;
  }[];
  
  // Shipping details
  warehouseId: number;
  ewaybillNumber?: string;
  invoiceDocFile?: string;
  ewaybillDocFile?: string;
  selectedCourierId?: number;
}

export default function HeavyOrderScreen() {
  const router = useRouter();
  const {
    loading,
    error,
    getWarehouses,
    getCouriers,
    createHeavyOrder,
    getShippingRates,
    manifestHeavyOrder,
    getShipmentData
  } = useBigShip();
  const { processPayment } = useRazorpay();
  
  // State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<HeavyOrderForm>({
    firstName: '',
    lastName: '',
    companyName: '',
    contactNumber: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    pincode: '',
    city: '',
    state: '',
    invoiceId: `INV-${Date.now()}`,
    totalAmount: 0,
    advanceAmount: 0,
    codAmount: 0,
    products: [{
      name: '',
      category: 'Others',
      quantity: 1,
      weight: 0,
      length: 0,
      width: 0,
      height: 0
    }],
    warehouseId: 0
  });
  
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [rates, setRates] = useState<any[]>([]);
  const [orderCreated, setOrderCreated] = useState(false);
  const [systemOrderId, setSystemOrderId] = useState<number | null>(null);
  const [shippingDetails, setShippingDetails] = useState<{
    awb?: string;
    label?: string;
    manifest?: string;
  }>({});
  
  // Load warehouses on mount
  useEffect(() => {
    loadWarehouses();
  }, []);
  
  // Load couriers when shipment type is selected
  useEffect(() => {
    if (step >= 2) {
      loadCouriers();
    }
  }, [step]);
  
  // Load warehouses
  const loadWarehouses = async () => {
    const warehouseData = await getWarehouses();
    if (warehouseData?.result_data) {
      setWarehouses(warehouseData.result_data);
      // Set default warehouse if available
      if (warehouseData.result_data.length > 0) {
        setForm(prev => ({
          ...prev,
          warehouseId: warehouseData.result_data[0].warehouse_id
        }));
      }
    }
  };
  
  // Load courier list
  const loadCouriers = async () => {
    const couriersData = await getCouriers(ShipmentCategory.B2B);
    if (couriersData) {
      setCouriers(couriersData);
    }
  };
  
  // Calculate advance and COD amounts
  const calculatePayments = (total: number) => {
    const advance = total * 0.5;
    const cod = total * 0.5;
    
    setForm(prev => ({
      ...prev,
      totalAmount: total,
      advanceAmount: advance,
      codAmount: cod
    }));
  };
  
  // Process step 1 - Basic details
  const processStep1 = () => {
    // Validate form
    if (!form.firstName || !form.lastName || !form.contactNumber || 
        !form.addressLine1 || !form.pincode || !form.totalAmount) {
      alert('Please fill in all required fields');
      return;
    }
    
    setStep(2);
  };
  
  // Process step 2 - Product details and initial payment
  const processStep2 = async () => {
    // Validate product details
    const invalidProducts = form.products.filter(
      p => !p.name || p.quantity < 1 || p.weight < 0.1
    );
    
    if (invalidProducts.length > 0) {
      alert('Please complete all product details');
      return;
    }
    
    try {
      // Process advance payment through Razorpay
      const paymentResult = await processPayment({
        amount: form.advanceAmount * 100, // Convert to paise
        currency: 'INR',
        receipt: form.invoiceId
      });
      
      if (paymentResult.success) {
        // Save payment details
        await createPayment({
          orderId: form.invoiceId,
          amount: form.advanceAmount,
          paymentId: paymentResult.paymentId || `rzp_${Date.now()}`, // Fallback if paymentId is undefined
          type: 'advance'
        });
        
        setStep(3);
        
        // Create heavy order
        await createB2BOrder();
      } else {
        alert('Payment failed: ' + paymentResult.error);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to process payment');
    }
  };
  
  // Create B2B heavy order
  const createB2BOrder = async () => {
    try {
      // Format product details for BigShip API
      const boxDetails: BoxDetail[] = form.products.map(product => ({
        each_box_dead_weight: product.weight,
        each_box_length: product.length,
        each_box_width: product.width,
        each_box_height: product.height,
        box_count: product.quantity,
        product_details: [{
          product_category: product.category as any,
          product_name: product.name,
          product_quantity: product.quantity
        }]
      }));
      
      // Create order data
      const orderData = {
        shipment_category: ShipmentCategory.B2B,
        warehouse_detail: {
          pickup_location_id: form.warehouseId,
          return_location_id: form.warehouseId
        },
        consignee_detail: {
          first_name: form.firstName,
          last_name: form.lastName,
          company_name: form.companyName,
          contact_number_primary: form.contactNumber,
          email_id: form.email,
          consignee_address: {
            address_line1: form.addressLine1,
            address_line2: form.addressLine2,
            address_landmark: form.landmark,
            pincode: form.pincode
          }
        },
        order_detail: {
          invoice_date: new Date().toISOString(),
          invoice_id: form.invoiceId,
          payment_type: PaymentType.COD,
          shipment_invoice_amount: form.totalAmount,
          total_collectable_amount: form.codAmount,
          box_details: boxDetails,
          ewaybill_number: form.ewaybillNumber,
          document_detail: {
            invoice_document_file: form.invoiceDocFile || "dummy_invoice.pdf",
            ewaybill_document_file: form.ewaybillDocFile
          }
        }
      };
      
      // Create order in BigShip
      const orderResponse = await createHeavyOrder(orderData as any);
      
      if (orderResponse) {
        // Parse system order ID from response
        // Response is typically in format "Order Created Successfully, Order ID: 12345"
        const orderIdMatch = orderResponse.match(/Order ID: (\d+)/);
        if (orderIdMatch && orderIdMatch[1]) {
          const orderID = parseInt(orderIdMatch[1]);
          setSystemOrderId(orderID);
          setOrderCreated(true);
          
          // Save order details to our system
          await saveOrderDetails({
            orderId: form.invoiceId,
            systemOrderId: orderID,
            customer: {
              name: `${form.firstName} ${form.lastName}`,
              company: form.companyName,
              email: form.email,
              phone: form.contactNumber
            },
            shipping: {
              address: `${form.addressLine1}, ${form.addressLine2}`,
              city: form.city,
              state: form.state,
              pincode: form.pincode
            },
            products: form.products,
            payment: {
              total: form.totalAmount,
              advance: form.advanceAmount,
              cod: form.codAmount
            },
            status: 'created'
          });
          
          // Fetch shipping rates
          loadShippingRates(orderID);
        } else {
          alert('Order created but could not extract order ID');
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order');
    }
  };
  
  // Load shipping rates
  const loadShippingRates = async (orderId: number) => {
    setRatesLoading(true);
    try {
      const ratesData = await getShippingRates(
        ShipmentCategory.B2B, 
        orderId,
        RiskType.OwnerRisk
      );
      
      if (ratesData) {
        setRates(ratesData);
      }
    } catch (error) {
      console.error('Error getting rates:', error);
    } finally {
      setRatesLoading(false);
    }
  };
  
  // Select courier and manifest order
  const selectCourierAndManifest = async (courierId: number) => {
    if (!systemOrderId) return;
    
    try {
      // Update form state
      setForm(prev => ({
        ...prev,
        selectedCourierId: courierId
      }));
      
      // Manifest the order with selected courier
      const manifestResult = await manifestHeavyOrder(
        systemOrderId,
        courierId,
        RiskType.OwnerRisk
      );
      
      if (manifestResult) {
        // Update order status in our system
        await updateOrder(form.invoiceId, {
          status: 'manifested',
          courierId
        });
        
        // Get shipping documents
        await getShippingDocuments();
        
        // Move to next step
        setStep(4);
      }
    } catch (error) {
      console.error('Error manifesting order:', error);
      alert('Failed to manifest order');
    }
  };
  
  // Get shipping documents (AWB, label, manifest)
  const getShippingDocuments = async () => {
    if (!systemOrderId) return;
    
    try {
      // Get AWB
      const awbData = await getShipmentData(1, systemOrderId);
      if (awbData) {
        setShippingDetails(prev => ({
          ...prev,
          awb: awbData.master_awb
        }));
      }
      
      // Get shipping label
      const labelData = await getShipmentData(2, systemOrderId);
      if (labelData) {
        setShippingDetails(prev => ({
          ...prev,
          label: labelData.res_FileContent
        }));
      }
      
      // Get manifest
      const manifestData = await getShipmentData(3, systemOrderId);
      if (manifestData) {
        setShippingDetails(prev => ({
          ...prev,
          manifest: manifestData.res_FileContent
        }));
      }
      
      // Update order with shipping details
      await updateOrder(form.invoiceId, {
        shipping: {
          ...shippingDetails,
          trackingUrl: `https://yourapp.com/tracking?awb=${awbData?.master_awb}`
        }
      });
      
    } catch (error) {
      console.error('Error getting shipping documents:', error);
    }
  };
  
  // Render step 1: Basic details
  const renderStep1 = () => (
    <VStack space="md">
      <FormControl>
        <FormControl.Label>Customer Name</FormControl.Label>
        <HStack space="sm">
          <Input 
            flex={1}
            placeholder="First Name" 
            value={form.firstName}
            onChangeText={value => setForm({...form, firstName: value})}
          />
          <Input 
            flex={1}
            placeholder="Last Name" 
            value={form.lastName}
            onChangeText={value => setForm({...form, lastName: value})}
          />
        </HStack>
      </FormControl>
      
      <FormControl>
        <FormControl.Label>Company Name</FormControl.Label>
        <Input 
          placeholder="Company Name" 
          value={form.companyName}
          onChangeText={value => setForm({...form, companyName: value})}
        />
      </FormControl>
      
      <FormControl>
        <FormControl.Label>Contact Details</FormControl.Label>
        <Input 
          placeholder="Contact Number" 
          keyboardType="phone-pad"
          value={form.contactNumber}
          onChangeText={value => setForm({...form, contactNumber: value})}
        />
      </FormControl>
      
      <FormControl>
        <FormControl.Label>Email</FormControl.Label>
        <Input 
          placeholder="Email" 
          keyboardType="email-address"
          value={form.email}
          onChangeText={value => setForm({...form, email: value})}
        />
      </FormControl>
      
      <FormControl>
        <FormControl.Label>Shipping Address</FormControl.Label>
        <Input 
          placeholder="Address Line 1" 
          value={form.addressLine1}
          onChangeText={value => setForm({...form, addressLine1: value})}
        />
        <Input 
          mt="xs"
          placeholder="Address Line 2 (Optional)" 
          value={form.addressLine2}
          onChangeText={value => setForm({...form, addressLine2: value})}
        />
        <Input 
          mt="xs"
          placeholder="Landmark (Optional)" 
          value={form.landmark}
          onChangeText={value => setForm({...form, landmark: value})}
        />
      </FormControl>
      
      <FormControl>
        <FormControl.Label>Location</FormControl.Label>
        <HStack space="sm">
          <Input 
            flex={1}
            placeholder="Pincode" 
            keyboardType="numeric"
            value={form.pincode}
            onChangeText={value => setForm({...form, pincode: value})}
          />
          <Input 
            flex={1}
            placeholder="City" 
            value={form.city}
            onChangeText={value => setForm({...form, city: value})}
          />
        </HStack>
        <Input 
          mt="xs"
          placeholder="State" 
          value={form.state}
          onChangeText={value => setForm({...form, state: value})}
        />
      </FormControl>
      
      <FormControl>
        <FormControl.Label>Order Amount</FormControl.Label>
        <Input 
          placeholder="Total Amount" 
          keyboardType="numeric"
          value={form.totalAmount.toString()}
          onChangeText={value => {
            const amount = parseFloat(value) || 0;
            calculatePayments(amount);
          }}
        />
      </FormControl>
      
      <FormControl>
        <FormControl.Label>Payment Split</FormControl.Label>
        <HStack space="sm">
          <Box flex={1}>
            <Text>Advance (50%)</Text>
            <Text fontWeight="bold">₹ {form.advanceAmount.toFixed(2)}</Text>
          </Box>
          <Box flex={1}>
            <Text>COD (50%)</Text>
            <Text fontWeight="bold">₹ {form.codAmount.toFixed(2)}</Text>
          </Box>
        </HStack>
      </FormControl>
      
      <Button 
        onPress={processStep1}
        isDisabled={loading}
        mt="lg"
      >
        <Button.Text>Continue to Product Details</Button.Text>
      </Button>
    </VStack>
  );
  
  // Render step 2: Product details
  const renderStep2 = () => (
    <VStack space="md">
      <FormControl>
        <FormControl.Label>Pickup Warehouse</FormControl.Label>
        <Select
          selectedValue={form.warehouseId.toString()}
          onValueChange={value => setForm({...form, warehouseId: parseInt(value)})}
        >
          {warehouses.map(warehouse => (
            <SelectItem 
              key={warehouse.warehouse_id} 
              label={warehouse.warehouse_name} 
              value={warehouse.warehouse_id.toString()} 
            />
          ))}
        </Select>
      </FormControl>
      
      <FormControl>
        <FormControl.Label>E-way Bill Number (Optional)</FormControl.Label>
        <Input 
          placeholder="E-way Bill Number" 
          value={form.ewaybillNumber || ''}
          onChangeText={value => setForm({...form, ewaybillNumber: value})}
        />
      </FormControl>
      
      <Text fontWeight="bold" fontSize="xl" mt="md">Products</Text>
      
      {form.products.map((product, index) => (
        <Box 
          key={index}
          borderWidth={1}
          borderColor="gray.300"
          borderRadius="md"
          p="md"
          mt="sm"
        >
          <FormControl>
            <FormControl.Label>Product Name</FormControl.Label>
            <Input 
              placeholder="Product Name" 
              value={product.name}
              onChangeText={value => {
                const newProducts = [...form.products];
                newProducts[index].name = value;
                setForm({...form, products: newProducts});
              }}
            />
          </FormControl>
          
          <HStack space="sm" mt="xs">
            <FormControl flex={1}>
              <FormControl.Label>Quantity</FormControl.Label>
              <Input 
                placeholder="Qty" 
                keyboardType="numeric"
                value={product.quantity.toString()}
                onChangeText={value => {
                  const newProducts = [...form.products];
                  newProducts[index].quantity = parseInt(value) || 0;
                  setForm({...form, products: newProducts});
                }}
              />
            </FormControl>
            
            <FormControl flex={1}>
              <FormControl.Label>Weight (kg)</FormControl.Label>
              <Input 
                placeholder="Weight" 
                keyboardType="numeric"
                value={product.weight.toString()}
                onChangeText={value => {
                  const newProducts = [...form.products];
                  newProducts[index].weight = parseFloat(value) || 0;
                  setForm({...form, products: newProducts});
                }}
              />
            </FormControl>
          </HStack>
          
          <Text mt="sm" mb="xs">Dimensions (cm)</Text>
          <HStack space="xs">
            <Input 
              flex={1}
              placeholder="Length" 
              keyboardType="numeric"
              value={product.length.toString()}
              onChangeText={value => {
                const newProducts = [...form.products];
                newProducts[index].length = parseFloat(value) || 0;
                setForm({...form, products: newProducts});
              }}
            />
            <Input 
              flex={1}
              placeholder="Width" 
              keyboardType="numeric"
              value={product.width.toString()}
              onChangeText={value => {
                const newProducts = [...form.products];
                newProducts[index].width = parseFloat(value) || 0;
                setForm({...form, products: newProducts});
              }}
            />
            <Input 
              flex={1}
              placeholder="Height" 
              keyboardType="numeric"
              value={product.height.toString()}
              onChangeText={value => {
                const newProducts = [...form.products];
                newProducts[index].height = parseFloat(value) || 0;
                setForm({...form, products: newProducts});
              }}
            />
          </HStack>
          
          {index > 0 && (
            <Button 
              variant="outline"
              onPress={() => {
                const newProducts = form.products.filter((_, i) => i !== index);
                setForm({...form, products: newProducts});
              }}
              mt="sm"
              size="sm"
            >
              <Button.Text>Remove</Button.Text>
            </Button>
          )}
        </Box>
      ))}
      
      <Button 
        variant="outline"
        onPress={() => {
          setForm({
            ...form, 
            products: [
              ...form.products, 
              {
                name: '',
                category: 'Others',
                quantity: 1,
                weight: 0,
                length: 0,
                width: 0,
                height: 0
              }
            ]
          });
        }}
        mt="sm"
      >
        <Button.Text>Add Another Product</Button.Text>
      </Button>
      
      <Button 
        onPress={processStep2}
        mt="xl"
        isDisabled={loading}
      >
        <Button.Text>Process Advance Payment (₹{form.advanceAmount.toFixed(2)})</Button.Text>
      </Button>
    </VStack>
  );
  
  // Render step 3: Courier selection
  const renderStep3 = () => (
    <VStack space="md">
      <Box
        bg="green.100"
        p="md"
        borderRadius="md"
      >
        <Text color="green.800" fontWeight="bold">Order Created Successfully!</Text>
        <Text color="green.800">Order ID: {systemOrderId}</Text>
        <Text color="green.800">Select a courier to ship your order</Text>
      </Box>
      
      {ratesLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <ScrollView>
          {rates.length > 0 ? (
            rates.map((rate, index) => (
              <Box 
                key={index}
                borderWidth={1}
                borderColor={form.selectedCourierId === rate.courier_id ? "blue.500" : "gray.300"}
                bg={form.selectedCourierId === rate.courier_id ? "blue.50" : "white"}
                borderRadius="md"
                p="md"
                mt="sm"
              >
                <HStack justifyContent="space-between">
                  <Text fontWeight="bold">{rate.courier_name}</Text>
                  <Text fontWeight="bold">₹ {rate.total_shipping_charges}</Text>
                </HStack>
                
                <Text mt="xs">Estimated Delivery: {rate.tat} days</Text>
                
                <Button 
                  mt="sm"
                  size="sm"
                  isDisabled={loading}
                  onPress={() => selectCourierAndManifest(rate.courier_id)}
                >
                  <Button.Text>Select Courier</Button.Text>
                </Button>
              </Box>
            ))
          ) : (
            <Text>No shipping rates available for this order</Text>
          )}
        </ScrollView>
      )}
    </VStack>
  );
  
  // Render step 4: Order confirmation
  const renderStep4 = () => (
    <VStack space="md">
      <Box
        bg="green.100"
        p="md"
        borderRadius="md"
      >
        <Text color="green.800" fontWeight="bold">Order Manifested Successfully!</Text>
        <Text color="green.800">AWB Number: {shippingDetails.awb || 'Processing...'}</Text>
      </Box>
      
      <Text fontWeight="bold" fontSize="lg">Shipping Details</Text>
      <Text>Order ID: {systemOrderId}</Text>
      <Text>Customer: {form.firstName} {form.lastName}</Text>
      <Text>Company: {form.companyName}</Text>
      <Text>Amount: ₹{form.totalAmount.toFixed(2)}</Text>
      <Text>COD Amount: ₹{form.codAmount.toFixed(2)}</Text>
      
      <HStack space="md" mt="lg">
        <Button 
          flex={1}
          variant="outline"
          onPress={() => router.push('/orders')}
        >
          <Button.Text>Go to Orders</Button.Text>
        </Button>
        
        <Button 
          flex={1}
          onPress={() => {
            // Reset form and start over
            router.push('/');
          }}
        >
          <Button.Text>Home</Button.Text>
        </Button>
      </HStack>
    </VStack>
  );
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Create B2B Heavy Order</Text>
      
      {/* Progress indicator */}
      <HStack mt="lg" mb="xl" space="xs">
        <Box 
          flex={1} 
          h="2" 
          bg={step >= 1 ? "blue.500" : "gray.200"} 
          borderRadius="full"
        />
        <Box 
          flex={1} 
          h="2" 
          bg={step >= 2 ? "blue.500" : "gray.200"} 
          borderRadius="full"
        />
        <Box 
          flex={1} 
          h="2" 
          bg={step >= 3 ? "blue.500" : "gray.200"} 
          borderRadius="full"
        />
        <Box 
          flex={1} 
          h="2" 
          bg={step >= 4 ? "blue.500" : "gray.200"} 
          borderRadius="full"
        />
      </HStack>
      
      {/* Step title */}
      <Text style={styles.stepTitle}>
        {step === 1 ? 'Customer Details' : 
         step === 2 ? 'Product Information' :
         step === 3 ? 'Shipping Options' : 'Order Confirmation'}
      </Text>
      
      {/* Error message */}
      {error && (
        <Box bg="red.100" p="sm" borderRadius="md" mb="md">
          <Text color="red.800">{error.message}</Text>
        </Box>
      )}
      
      {/* Steps */}
      {step === 1 ? renderStep1() :
       step === 2 ? renderStep2() :
       step === 3 ? renderStep3() : renderStep4()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
  },
});
