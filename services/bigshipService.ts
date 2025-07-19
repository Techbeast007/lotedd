import axios, { AxiosError, AxiosInstance } from 'axios';
import Constants from 'expo-constants';

// Define types for API responses and requests
export interface BigShipResponse<T> {
  data: T | null;
  success: boolean;
  message: string;
  responseCode: number;
}

export interface TokenResponse {
  token: string;
}

export interface PaymentCategory {
  payment_category: string;
  status: boolean;
}

export interface Courier {
  shipment_category: string;
  courier_id: number;
  courier_name: string;
  courier_type: string;
  courier_status: boolean;
  admin_status: boolean;
}

export interface Warehouse {
  warehouse_id: number;
  contact_person_name?: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string;
  address_landmark?: string;
  address_pincode: number;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  address_email_id?: string;
  contact_number_primary: string;
}

export interface WarehouseResponse {
  result_count: number;
  result_data: {
    warehouse_id: number;
    warehouse_name: string;
    address_line1: string;
    address_line2: string | null;
    address_landmark: string | null;
    address_pincode: string;
    address_city: string;
    address_state: string;
    warehouse_contact_person: string;
    warehouse_contact_number_primary: string;
    create_date: string;
  }[];
}

export interface ShippingRate {
  system_order_id: number;
  courier_id: number;
  courier_name: string;
  risk_type_name: string | null;
  total_shipping_charges: number;
  freight_charge: number;
  cod_charge: number;
  other_additional_charges: {
    risk_type_charge?: number;
    lr_cost?: number;
    green_tax?: number;
    handling_charge?: number;
    to_pay?: number;
    oda?: number;
    warai_charge?: number;
    state_tax?: number;
    odc_charge?: number;
    pickup_charge?: number;
  } | null;
}

export interface RateCalculation {
  courier_id: number;
  courier_name: string;
  courier_type: string;
  zone: string;
  tat: number;
  billable_weight: number;
  risk_type_name: string | null;
  total_shipping_charges: number;
  courier_charge: number;
  other_additional_charges: {
    risk_type_charge?: number;
    lr_cost?: number;
    green_tax?: number;
    handling_charge?: number;
    pickup_charge?: number;
    state_tax?: number;
    to_pay?: number;
    oda?: number;
    warai_charge?: number;
    odc_charge?: number;
  } | null;
}

export interface BoxDetail {
  each_box_dead_weight: number;
  each_box_length: number;
  each_box_width: number;
  each_box_height: number;
  each_box_invoice_amount?: number;
  each_box_collectable_amount?: number;
  box_count: number;
  product_details?: ProductDetail[];
}

export interface ProductDetail {
  product_category: ProductCategory;
  product_sub_category?: string;
  product_name: string;
  product_quantity: number;
  each_product_invoice_amount?: number;
  each_product_collectable_amount?: number;
  hsn?: string;
}

export enum ProductCategory {
  Accessories = "Accessories",
  FashionClothing = "FashionClothing",
  BookStationary = "BookStationary",
  Electronics = "Electronics",
  FMCG = "FMCG",
  Footwear = "Footwear",
  Toys = "Toys",
  SportsEquipment = "SportsEquipment",
  Others = "Others",
  Wellness = "Wellness",
  Medicines = "Medicines"
}

export enum ShipmentCategory {
  B2C = "b2c",
  B2B = "b2b"
}

export enum PaymentType {
  COD = "COD",
  Prepaid = "Prepaid",
  ToPay = "ToPay"
}

export enum RiskType {
  OwnerRisk = "OwnerRisk",
  CarrierRisk = "CarrierRisk"
}

export interface TrackingDetail {
  order_detail: {
    courier_name: string;
    tracking_type: string;
    tracking_id: string;
    invoice_id: string;
    order_manifest_datetime: string;
    current_tracking_datetime: string;
    current_tracking_status: string;
  };
  scan_histories: {
    scan_datetime: string;
    scan_status: string;
    scan_remarks: string;
    scan_location: string;
  }[];
}

class BigShipService {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    const baseURL = "https://api.bigship.in/";
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor to handle rate limiting and other common errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const { response } = error;

        if (response?.status === 429) {
          console.error('BigShip API rate limit exceeded. Please wait before making more requests.');
        } else if (response?.status === 401) {
          // Token might be expired, try to refresh it
          try {
            await this.refreshToken();
            // Retry the original request with new token
            if (error.config) {
              error.config.headers['Authorization'] = `Bearer ${this.token}`;
              return this.client.request(error.config);
            }
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Helper method to get environment variables safely
  private getEnvVariable(name: string): string {
    const value = process.env[name] || Constants.expoConfig?.extra?.[name];
    if (!value) {
      console.warn(`Environment variable ${name} not found`);
      return '';
    }
    return value;
  }

  // Helper method to check if token is valid
  private isTokenValid(): boolean {
    if (!this.token || !this.tokenExpiry) return false;
    // Consider token expired 5 minutes before actual expiry to avoid edge cases
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now < this.tokenExpiry;
  }

  // Method to refresh the token
  private async refreshToken(): Promise<void> {
    try {
      const username = this.getEnvVariable('BIGSHIP_USERNAME');
      const password = this.getEnvVariable('BIGSHIP_PASSWORD');
      const accessKey = this.getEnvVariable('BIGSHIP_ACCESS_KEY');
      // Debug log for env values
    //   console.log('BigShip ENV:', { username, password, accessKey });
    //   if (!username || !password || !accessKey) {
    //     throw new Error('BigShip credentials not configured');
    //   }

      const response = await this.client.post<BigShipResponse<TokenResponse>>('api/login/user', {
        user_name: 'anu.sharma1408@gmail.com',
        password: 'Anurag@!12',
        access_key: '8a7e511781614a53e780e8b3383a27f96b7e3641d9999058a7b78c3d7a0a879a'
      });

      if (response.data.success && response.data.data) {
        this.token = response.data.data.token;
        
        // Set expiry to 12 hours from now (as per API documentation)
        this.tokenExpiry = new Date();
        this.tokenExpiry.setHours(this.tokenExpiry.getHours() + 12);
        
        // Update default headers for future requests
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        
        console.log('BigShip token refreshed successfully');
      } else {
        throw new Error(`Failed to get token: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error refreshing BigShip token:', error);
      throw error;
    }
  }

  // Ensure token is valid before making API calls
  private async ensureToken(): Promise<void> {
    if (!this.isTokenValid()) {
      await this.refreshToken();
    }
  }

  // 1. Login / Generate Token
  async login(): Promise<string> {
    await this.refreshToken();
    return this.token || '';
  }

  // 2. Get Payment Category
  async getPaymentCategory(shipmentCategory: ShipmentCategory): Promise<PaymentCategory[]> {
    await this.ensureToken();
    try {
      const response = await this.client.get<BigShipResponse<PaymentCategory[]>>(
        `api/payment/category?shipment_category=${shipmentCategory}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting payment categories:', error);
      throw error;
    }
  }

  // 3. Get Courier List
  async getCourierList(shipmentCategory: ShipmentCategory): Promise<Courier[]> {
    await this.ensureToken();
    try {
      const response = await this.client.get<BigShipResponse<Courier[]>>(
        `api/courier/get/all?shipment_category=${shipmentCategory}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting courier list:', error);
      throw error;
    }
  }

  // 4. Get Current Wallet Balance
  async getWalletBalance(): Promise<string> {
    await this.ensureToken();
    try {
      const response = await this.client.get<BigShipResponse<string>>(
        'api/Wallet/balance/get'
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data || '0';
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      throw error;
    }
  }

  // 5. Add Warehouse
  async addWarehouse(warehouseData: {
    address_line1: string;
    address_line2?: string;
    address_landmark?: string;
    address_pincode: number;
    contact_number_primary: string;
  }): Promise<Warehouse> {
    await this.ensureToken();
    try {
      const response = await this.client.post<BigShipResponse<Warehouse>>(
        'api/warehouse/add',
        warehouseData
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data as Warehouse;
    } catch (error) {
      console.error('Error adding warehouse:', error);
      throw error;
    }
  }

  // 6. Add Single Order (B2C)
  async addSingleOrder(orderData: {
    shipment_category: ShipmentCategory.B2C;
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
      document_detail?: {
        invoice_document_file?: string;
        ewaybill_document_file?: string;
      };
    };
  }): Promise<string> {
    await this.ensureToken();
    try {
      const response = await this.client.post<BigShipResponse<string>>(
        'api/order/add/single',
        orderData
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data || '';
    } catch (error) {
      console.error('Error adding single order:', error);
      throw error;
    }
  }

  // 7. Manifest Single Order (B2C)
  async manifestSingleOrder(systemOrderId: number, courierId?: number): Promise<void> {
    await this.ensureToken();
    try {
      const payload = {
        system_order_id: systemOrderId,
        ...(courierId ? { courier_id: courierId } : {})
      };

      const response = await this.client.post<BigShipResponse<null>>(
        'api/order/manifest/single',
        payload
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error manifesting single order:', error);
      throw error;
    }
  }

  // 8. Get AWB, Label and Manifest
  async getShipmentData(shipmentDataId: 1 | 2 | 3, systemOrderId: number): Promise<any> {
    await this.ensureToken();
    try {
      const response = await this.client.post<BigShipResponse<any>>(
        `api/shipment/data?shipment_data_id=${shipmentDataId}&system_order_id=${systemOrderId}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error getting shipment data:', error);
      throw error;
    }
  }

  // Get AWB details
  async getAWB(systemOrderId: number) {
    return this.getShipmentData(1, systemOrderId);
  }

  // Get Label PDF
  async getLabel(systemOrderId: number) {
    return this.getShipmentData(2, systemOrderId);
  }

  // Get Manifest PDF
  async getManifest(systemOrderId: number) {
    return this.getShipmentData(3, systemOrderId);
  }

  // 9. Cancel AWB
  async cancelAWB(awbs: string[]): Promise<{
    courier_id: number;
    master_awb: string;
    cancel_response: string;
  }[]> {
    await this.ensureToken();
    try {
      const response = await this.client.put<BigShipResponse<{
        courier_id: number;
        master_awb: string;
        cancel_response: string;
      }[]>>(
        'api/order/cancel',
        awbs
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data || [];
    } catch (error) {
      console.error('Error cancelling AWB:', error);
      throw error;
    }
  }

  // 11. Get Shipping Rates List
  async getShippingRates(
    shipmentCategory: ShipmentCategory, 
    systemOrderId: number,
    riskType?: RiskType
  ): Promise<ShippingRate[]> {
    await this.ensureToken();
    try {
      let url = `api/order/shipping/rates?shipment_category=${shipmentCategory}&system_order_id=${systemOrderId}`;
      
      if (shipmentCategory === ShipmentCategory.B2B && riskType) {
        url += `&risk_type=${riskType}`;
      }
      
      const response = await this.client.get<BigShipResponse<ShippingRate[]>>(url);
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting shipping rates:', error);
      throw error;
    }
  }

  // 12. Add Heavy Order (B2B)
  async addHeavyOrder(orderData: {
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
  }): Promise<string> {
    await this.ensureToken();
    try {
      const response = await this.client.post<BigShipResponse<string>>(
        'api/order/add/heavy',
        orderData
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data || '';
    } catch (error) {
      console.error('Error adding heavy order:', error);
      throw error;
    }
  }

  // 13. Manifest Heavy Order (B2B)
  async manifestHeavyOrder(
    systemOrderId: number,
    courierId: number,
    riskType?: RiskType
  ): Promise<void> {
    await this.ensureToken();
    try {
      const payload = {
        system_order_id: systemOrderId,
        courier_id: courierId,
        ...(riskType ? { risk_type: riskType } : {})
      };

      const response = await this.client.post<BigShipResponse<null>>(
        'api/order/manifest/heavy',
        payload
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error manifesting heavy order:', error);
      throw error;
    }
  }

  // 15. Calculate Rates
  async calculateRates(rateData: {
    shipment_category: ShipmentCategory;
    payment_type: PaymentType;
    pickup_pincode: number;
    destination_pincode: number;
    shipment_invoice_amount: number;
    risk_type?: RiskType;
    box_details: BoxDetail[];
  }): Promise<RateCalculation[]> {
    await this.ensureToken();
    try {
      // Ensure every box has product_details
      const safeBoxDetails = rateData.box_details.map(box => ({
        ...box,
        product_details: box.product_details && box.product_details.length > 0
          ? box.product_details
          : [{
              product_category: ProductCategory.Others,
              product_name: 'Sample Product',
              product_quantity: 1
            }]
      }));
      const safePayload = { ...rateData, box_details: safeBoxDetails };
      // Debug log for payload
      console.log('BigShip rate calculation payload:', safePayload);
      const response = await this.client.post<BigShipResponse<RateCalculation[]>>(
        'api/calculator',
        safePayload
      );
      // Debug log for response
      console.log('BigShip rate calculation response:', response.data);
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      return response.data.data || [];
    } catch (error) {
      console.error('Error calculating rates:', error);
      throw error;
    }
  }

  // 16. Get Tracking Details
  async getTrackingDetails(
    trackingType: 'lrn' | 'awb',
    trackingId: string
  ): Promise<TrackingDetail> {
    await this.ensureToken();
    try {
      const response = await this.client.get<BigShipResponse<TrackingDetail>>(
        `api/tracking?tracking_type=${trackingType}&tracking_id=${trackingId}`
      );
      
      if (!response.data.success && response.data.responseCode !== 200) {
        throw new Error(response.data.message);
      }
      
      return response.data.data as TrackingDetail;
    } catch (error) {
      console.error('Error getting tracking details:', error);
      throw error;
    }
  }

  // 18. Get Warehouse List
  async getWarehouseList(pageIndex: number = 1, pageSize: number = 10): Promise<WarehouseResponse> {
    await this.ensureToken();
    try {
      const response = await this.client.get<BigShipResponse<WarehouseResponse>>(
        `api/warehouse/get/list?page_index=${pageIndex}&page_size=${pageSize}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      return response.data.data as WarehouseResponse;
    } catch (error) {
      console.error('Error getting warehouse list:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const bigshipService = new BigShipService();
export default bigshipService;
