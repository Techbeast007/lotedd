import { CountryCode, countryCodes } from '@/constants/CountryCodes';
import { ChevronDown, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  style?: any;
}

export default function CountryCodeSelector({ value, onChange, style }: CountryCodeSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(countryCodes);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);

  // Find the selected country based on the current value
  useEffect(() => {
    const country = countryCodes.find(c => c.dialCode === value);
    setSelectedCountry(country || null);
  }, [value]);

  // Filter countries based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = countryCodes.filter(
        country => 
          country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.dialCode.includes(searchQuery) ||
          country.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries(countryCodes);
    }
  }, [searchQuery]);

  const handleSelectCountry = (country: CountryCode) => {
    onChange(country.dialCode);
    setSelectedCountry(country);
    setModalVisible(false);
    setSearchQuery('');
  };

  const renderItem = ({ item }: { item: CountryCode }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => handleSelectCountry(item)}
    >
      <Text style={styles.flag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.dialCode}>{item.dialCode}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorContainer, style]}
        onPress={() => setModalVisible(true)}
      >
        <Text>
          {selectedCountry ? (
            <Text>{selectedCountry.flag} {selectedCountry.dialCode}</Text>
          ) : (
            value
          )}
        </Text>
        <ChevronDown size={16} color="#666" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity 
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Search size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <FlatList
              data={filteredCountries}
              renderItem={renderItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={true}
              style={styles.list}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderColor: '#d1d5db',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '80%',
    ...Platform.select({
      web: {
        maxWidth: 400,
        marginLeft: 'auto',
        marginRight: 'auto',
        marginTop: '5%',
        marginBottom: '5%',
        borderRadius: 16,
        height: '90%',
      }
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    margin: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  list: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  dialCode: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
