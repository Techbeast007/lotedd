import { useBigShip } from '@/hooks/useBigShip';
import { RiskType, ShipmentCategory } from '@/services/bigshipService';
import React, { createContext, ReactNode, useContext, useState } from 'react';

// Define types for the BigShip context
interface BigShipContextType {
  // State
  loading: boolean;
  error: Error | null;
  
  // Shipping information
  availableCouriers: any[];
  shippingRates: any[];
  warehouses: any[];
  
  // Active order
  activeOrderId: number | null;
  trackingDetails: any | null;
  
  // Methods
  resetError: () => void;
  fetchCouriers: (shipmentCategory: ShipmentCategory) => Promise<any[]>;
  fetchWarehouses: () => Promise<any[]>;
  getShippingRates: (shipmentCategory: ShipmentCategory, systemOrderId: number, riskType?: RiskType) => Promise<any[]>;
  createB2COrder: (orderData: any) => Promise<string | null>;
  createHeavyOrder: (orderData: any) => Promise<string | null>;
  manifestB2COrder: (systemOrderId: number, courierId?: number) => Promise<boolean>;
  manifestHeavyOrder: (systemOrderId: number, courierId: number, riskType?: RiskType) => Promise<boolean>;
  getShippingDocuments: (systemOrderId: number) => Promise<{
    awb?: string;
    label?: string;
    manifest?: string;
  }>;
  trackShipment: (trackingId: string, trackingType?: 'lrn' | 'awb') => Promise<any>;
  cancelShipment: (awbs: string[]) => Promise<any>;
}

// Create the context
export const BigShipContext = createContext<BigShipContextType | undefined>(undefined);

// Context provider component
export const BigShipProvider = ({ children }: { children: ReactNode }) => {
  const bigShip = useBigShip();
  
  // Additional state for the context
  const [availableCouriers, setAvailableCouriers] = useState<any[]>([]);
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [trackingDetails, setTrackingDetails] = useState<any | null>(null);
  
  // Method to fetch couriers
  const fetchCouriers = async (shipmentCategory: ShipmentCategory) => {
    const result = await bigShip.getCouriers(shipmentCategory);
    if (result) {
      setAvailableCouriers(result);
    }
    return result || [];
  };
  
  // Method to fetch warehouses
  const fetchWarehouses = async () => {
    const result = await bigShip.getWarehouses();
    if (result?.result_data) {
      setWarehouses(result.result_data);
    }
    return result?.result_data || [];
  };
  
  // Method to get shipping rates
  const getShippingRates = async (
    shipmentCategory: ShipmentCategory, 
    systemOrderId: number, 
    riskType?: RiskType
  ) => {
    const result = await bigShip.getShippingRates(shipmentCategory, systemOrderId, riskType);
    if (result) {
      setShippingRates(result);
    }
    return result || [];
  };
  
  // Method to create B2C order
  const createB2COrder = async (orderData: any) => {
    const result = await bigShip.createOrder(orderData);
    if (result) {
      const orderIdMatch = result.match(/Order ID: (\d+)/);
      if (orderIdMatch && orderIdMatch[1]) {
        const orderId = parseInt(orderIdMatch[1]);
        setActiveOrderId(orderId);
      }
    }
    return result;
  };
  
  // Method to create heavy order
  const createHeavyOrder = async (orderData: any) => {
    const result = await bigShip.createHeavyOrder(orderData);
    if (result) {
      const orderIdMatch = result.match(/Order ID: (\d+)/);
      if (orderIdMatch && orderIdMatch[1]) {
        const orderId = parseInt(orderIdMatch[1]);
        setActiveOrderId(orderId);
      }
    }
    return result;
  };
  
  // Method to manifest B2C order
  const manifestB2COrder = async (systemOrderId: number, courierId?: number) => {
    return await bigShip.manifestOrder(systemOrderId, courierId);
  };
  
  // Method to manifest heavy order
  const manifestHeavyOrder = async (
    systemOrderId: number,
    courierId: number,
    riskType?: RiskType
  ) => {
    return await bigShip.manifestHeavyOrder(systemOrderId, courierId, riskType);
  };
  
  // Method to get shipping documents
  const getShippingDocuments = async (systemOrderId: number) => {
    const documents = {
      awb: undefined,
      label: undefined,
      manifest: undefined
    };
    
    try {
      // Get AWB
      const awbData = await bigShip.getShipmentData(1, systemOrderId);
      if (awbData) {
        documents.awb = awbData.master_awb;
      }
      
      // Get shipping label
      const labelData = await bigShip.getShipmentData(2, systemOrderId);
      if (labelData) {
        documents.label = labelData.res_FileContent;
      }
      
      // Get manifest
      const manifestData = await bigShip.getShipmentData(3, systemOrderId);
      if (manifestData) {
        documents.manifest = manifestData.res_FileContent;
      }
    } catch (error) {
      console.error('Error getting shipping documents:', error);
    }
    
    return documents;
  };
  
  // Method to track shipment
  const trackShipment = async (trackingId: string, trackingType: 'lrn' | 'awb' = 'lrn') => {
    const result = await bigShip.getTracking(trackingId, trackingType);
    if (result) {
      setTrackingDetails(result);
    }
    return result;
  };
  
  // Method to cancel shipment
  const cancelShipment = async (awbs: string[]) => {
    return await bigShip.cancelShipment(awbs);
  };
  
  // Context value
  const value: BigShipContextType = {
    loading: bigShip.loading,
    error: bigShip.error,
    availableCouriers,
    shippingRates,
    warehouses,
    activeOrderId,
    trackingDetails,
    resetError: bigShip.resetError,
    fetchCouriers,
    fetchWarehouses,
    getShippingRates,
    createB2COrder,
    createHeavyOrder,
    manifestB2COrder,
    manifestHeavyOrder,
    getShippingDocuments,
    trackShipment,
    cancelShipment
  };
  
  return (
    <BigShipContext.Provider value={value}>
      {children}
    </BigShipContext.Provider>
  );
};

// Hook to use the BigShip context
export const useBigShipContext = (): BigShipContextType => {
  const context = useContext(BigShipContext);
  if (context === undefined) {
    throw new Error('useBigShipContext must be used within a BigShipProvider');
  }
  return context;
};

// Usage example:
// 1. Wrap your app with the provider
// <BigShipProvider>
//   <App />
// </BigShipProvider>
//
// 2. Use the hook in your components
// const { createHeavyOrder, manifestHeavyOrder, loading } = useBigShipContext();
