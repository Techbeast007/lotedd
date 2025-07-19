import { useBigShip } from '@/hooks/useBigShip';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function TrackingScreen() {
  const params = useLocalSearchParams();
  const { getTracking } = useBigShip();
  
  const [awbNumber, setAwbNumber] = useState<string>(params.awb as string || '');
  const [trackingType, setTrackingType] = useState<'awb' | 'lrn'>('awb');
  const [loading, setLoading] = useState<boolean>(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // If AWB is provided in URL params, track it automatically
  useEffect(() => {
    if (params.awb) {
      handleTrackShipment();
    }
  }, [params.awb]);
  
  const handleTrackShipment = async () => {
    if (!awbNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTracking(awbNumber, trackingType);
      if (result) {
        setTrackingData(result);
      } else {
        setError('No tracking information found');
      }
    } catch (err) {
      setError('Failed to get tracking information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus.includes('delivered')) return '#28a745';
    if (lowercaseStatus.includes('transit')) return '#007bff';
    if (lowercaseStatus.includes('picked')) return '#17a2b8';
    if (lowercaseStatus.includes('return')) return '#dc3545';
    if (lowercaseStatus.includes('failed')) return '#dc3545';
    return '#6c757d';
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Track Your Shipment</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter AWB or Reference Number"
          value={awbNumber}
          onChangeText={setAwbNumber}
        />
        
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[
              styles.radioButton,
              trackingType === 'awb' && styles.radioButtonSelected
            ]}
            onPress={() => setTrackingType('awb')}
          >
            <Text
              style={[
                styles.radioText,
                trackingType === 'awb' && styles.radioTextSelected
              ]}
            >
              AWB
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.radioButton,
              trackingType === 'lrn' && styles.radioButtonSelected
            ]}
            onPress={() => setTrackingType('lrn')}
          >
            <Text
              style={[
                styles.radioText,
                trackingType === 'lrn' && styles.radioTextSelected
              ]}
            >
              Order ID
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleTrackShipment}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Tracking...' : 'Track'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {trackingData && (
        <ScrollView style={styles.resultContainer}>
          <View style={styles.trackingHeader}>
            <Text style={styles.courierName}>
              {trackingData.order_detail.courier_name}
            </Text>
            <Text style={styles.trackingId}>
              {trackingData.order_detail.tracking_id}
            </Text>
            <Text style={[
              styles.currentStatus,
              { color: getStatusColor(trackingData.order_detail.current_tracking_status) }
            ]}>
              {trackingData.order_detail.current_tracking_status}
            </Text>
          </View>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice ID:</Text>
              <Text style={styles.detailValue}>
                {trackingData.order_detail.invoice_id}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Manifest Date:</Text>
              <Text style={styles.detailValue}>
                {new Date(trackingData.order_detail.order_manifest_datetime).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Update:</Text>
              <Text style={styles.detailValue}>
                {new Date(trackingData.order_detail.current_tracking_datetime).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <Text style={styles.trackingHistoryTitle}>Tracking History</Text>
          
          {trackingData.scan_histories.map((scan: any, index: number) => (
            <View
              key={index}
              style={[
                styles.scanItem,
                index === 0 ? styles.latestScan : {}
              ]}
            >
              <View style={styles.timelinePoint}>
                <View style={styles.timelineCircle} />
                {index !== trackingData.scan_histories.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              
              <View style={styles.scanDetails}>
                <Text style={styles.scanStatus}>
                  {scan.scan_status}
                </Text>
                <Text style={styles.scanLocation}>
                  {scan.scan_location}
                </Text>
                <Text style={styles.scanDate}>
                  {new Date(scan.scan_datetime).toLocaleString()}
                </Text>
                {scan.scan_remarks && (
                  <Text style={styles.scanRemarks}>
                    {scan.scan_remarks}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  radioContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  radioButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ced4da',
    marginRight: 12,
    borderRadius: 4,
  },
  radioButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  radioText: {
    color: '#212529',
  },
  radioTextSelected: {
    color: 'white',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  errorText: {
    color: '#721c24',
  },
  resultContainer: {
    flex: 1,
  },
  trackingHeader: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  courierName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackingId: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 8,
  },
  currentStatus: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  trackingHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  scanItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  latestScan: {
    
  },
  timelinePoint: {
    width: 24,
    alignItems: 'center',
  },
  timelineCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007bff',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#dee2e6',
    marginTop: 4,
    marginBottom: 4,
    marginLeft: 7,
  },
  scanDetails: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  scanStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scanLocation: {
    fontSize: 14,
    marginBottom: 4,
  },
  scanDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  scanRemarks: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#495057',
    marginTop: 4,
  },
});
