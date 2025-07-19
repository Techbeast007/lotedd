import { bigshipService, BoxDetail, PaymentType, RiskType, ShipmentCategory } from '@/services/bigshipService';
import { useCallback, useState } from 'react';

// Hook for BigShip API integration
export function useBigShip() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Get couriers list
  const getCouriers = useCallback(async (shipmentCategory: ShipmentCategory) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.getCourierList(shipmentCategory);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch couriers'));
      setLoading(false);
      return null;
    }
  }, []);

  // Get payment categories
  const getPaymentCategories = useCallback(async (shipmentCategory: ShipmentCategory) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.getPaymentCategory(shipmentCategory);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch payment categories'));
      setLoading(false);
      return null;
    }
  }, []);

  // Calculate shipping rates
  const calculateRates = useCallback(async (rateData: {
    shipment_category: ShipmentCategory;
    payment_type: PaymentType;
    pickup_pincode: number;
    destination_pincode: number;
    shipment_invoice_amount: number;
    risk_type?: RiskType;
    box_details: BoxDetail[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.calculateRates(rateData);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to calculate shipping rates'));
      setLoading(false);
      return null;
    }
  }, []);

  // Get warehouses
  const getWarehouses = useCallback(async (pageIndex: number = 1, pageSize: number = 10) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.getWarehouseList(pageIndex, pageSize);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch warehouses'));
      setLoading(false);
      return null;
    }
  }, []);

  // Add warehouse
  const addWarehouse = useCallback(async (warehouseData: {
    contact_person_name: string;
    company_name?: string;
    address_line1: string;
    address_line2?: string;
    address_landmark?: string;
    address_pincode: number;
    contact_number_primary: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.addWarehouse(warehouseData);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add warehouse'));
      setLoading(false);
      return null;
    }
  }, []);

  // Create B2C order
  const createOrder = useCallback(async (orderData: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.addSingleOrder(orderData);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create order'));
      setLoading(false);
      return null;
    }
  }, []);

  // Get tracking details
  const getTracking = useCallback(async (
    trackingId: string, 
    trackingType: 'lrn' | 'awb' = 'lrn'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.getTrackingDetails(trackingType, trackingId);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get tracking details'));
      setLoading(false);
      return null;
    }
  }, []);

  // Get shipment data (label, manifest, etc.)
  const getShipmentData = useCallback(async (dataType: 1 | 2 | 3, orderId: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.getShipmentData(dataType, orderId);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get shipment data'));
      setLoading(false);
      return null;
    }
  }, []);

  // Manifest orders
  const manifestOrder = useCallback(async (systemOrderId: number, courierId?: number) => {
    setLoading(true);
    setError(null);
    try {
      await bigshipService.manifestSingleOrder(systemOrderId, courierId);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to manifest order'));
      setLoading(false);
      return false;
    }
  }, []);
  
  // Create B2B heavy order
  const createHeavyOrder = useCallback(async (orderData: {
    shipment_category: ShipmentCategory.B2B;
    warehouse_detail: {
      pickup_location_id: number;
      return_location_id: number;
    };
    consignee_detail: {
      first_name: string;
      last_name: string;
      company_name?: string;
      contact_number_primary: string;
      contact_number_secondary?: string;
      email_id?: string;
      consignee_address: {
        address_line1: string;
        address_line2?: string;
        address_landmark?: string;
        pincode: string;
      };
    };
    order_detail: {
      invoice_date: string; // ISO string
      invoice_id: string;
      payment_type: PaymentType;
      shipment_invoice_amount: number;
      total_collectable_amount: number;
      box_details: BoxDetail[];
      ewaybill_number?: string;
      document_detail: {
        invoice_document_file: string;
        ewaybill_document_file?: string;
      };
    };
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.addHeavyOrder(orderData);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create heavy order'));
      setLoading(false);
      return null;
    }
  }, []);

  // Get shipping rates for an existing order
  const getShippingRates = useCallback(async (
    shipmentCategory: ShipmentCategory, 
    systemOrderId: number,
    riskType?: RiskType
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.getShippingRates(shipmentCategory, systemOrderId, riskType);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get shipping rates'));
      setLoading(false);
      return null;
    }
  }, []);

  // Manifest a heavy order with courier selection
  const manifestHeavyOrder = useCallback(async (
    systemOrderId: number,
    courierId: number,
    riskType?: RiskType
  ) => {
    setLoading(true);
    setError(null);
    try {
      await bigshipService.manifestHeavyOrder(systemOrderId, courierId, riskType);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to manifest heavy order'));
      setLoading(false);
      return false;
    }
  }, []);
  
  // Cancel shipment/AWB
  const cancelShipment = useCallback(async (awbs: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.cancelAWB(awbs);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cancel shipment'));
      setLoading(false);
      return null;
    }
  }, []);

  // Get wallet balance
  const getWalletBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await bigshipService.getWalletBalance();
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get wallet balance'));
      setLoading(false);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    resetError,
    getCouriers,
    getPaymentCategories,
    calculateRates,
    getWarehouses,
    addWarehouse,
    createOrder,
    getTracking,
    getShipmentData,
    manifestOrder,
    createHeavyOrder,
    getShippingRates,
    manifestHeavyOrder,
    cancelShipment,
    getWalletBalance
  };
}

export default useBigShip;
