import axios from 'axios';

// Example: Fetch transactions (replace URL with real endpoint)
export const fetchTransactions = async () => {
  // Mock data for now
  return [
    { name: 'iPhone 15 256GB, Black', price: '$1255.02', customer: 'Olivia Rodrigo', status: 'Complete' },
    { name: 'iPhone Finewoven Black', price: '$86.83', customer: 'Bruno Mars', status: 'Complete' },
    { name: 'Airpods Pro 2nd Gen One Size', price: '$276.70', customer: 'Oliver Skyes', status: 'Delivery' },
    { name: 'MacBook Pro M2 256GB, Silver', price: '$1351.56', customer: 'Taylor Swift', status: 'Pending' },
  ];
  // Uncomment below for real API call
  // const response = await axios.get('/api/transactions');
  // return response.data;
}; 