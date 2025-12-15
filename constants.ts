import { Customer, DeliveryLog, DeliveryStatus, MilkType, PaymentMode } from "./types";

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    name: 'Sharma Family',
    mobile: '9876543210',
    address: 'Flat 101, Green Apts',
    milkType: MilkType.COW,
    defaultQuantity: 1.5,
    prices: {
      [MilkType.COW]: 60,
      [MilkType.BUFFALO]: 70
    },
    deliveryTime: 'Morning',
    startDate: '2023-01-01',
    paymentMode: PaymentMode.ONLINE,
    balance: 1200,
    isPaused: false,
  },
  {
    id: '2',
    name: 'Rahul Verma',
    mobile: '9988776655',
    address: 'House 42, Main Street',
    milkType: MilkType.BUFFALO,
    defaultQuantity: 1,
    prices: {
      [MilkType.COW]: 62,
      [MilkType.BUFFALO]: 72
    },
    deliveryTime: 'Morning',
    startDate: '2023-02-15',
    paymentMode: PaymentMode.CASH,
    balance: 2100,
    isPaused: false,
  },
  {
    id: '3',
    name: 'Anita Desai',
    mobile: '8899776655',
    address: 'Block C, City Heights',
    milkType: MilkType.BUFFALO, // Changed from Mix to Buffalo
    defaultQuantity: 2,
    prices: {
      [MilkType.COW]: 60,
      [MilkType.BUFFALO]: 75
    },
    deliveryTime: 'Evening',
    startDate: '2023-03-10',
    paymentMode: PaymentMode.ONLINE,
    balance: 0,
    isPaused: true,
  }
];

// Generate some mock logs for the current month
export const generateMockLogs = (): DeliveryLog[] => {
  const logs: DeliveryLog[] = [];
  const today = new Date();
  
  // Create logs for the last 5 days
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    MOCK_CUSTOMERS.forEach(c => {
      logs.push({
        id: `${c.id}-${dateStr}`,
        customerId: c.id,
        date: dateStr,
        status: c.isPaused ? DeliveryStatus.PAUSED : DeliveryStatus.DELIVERED,
        quantity: c.defaultQuantity,
        extras: i === 2 ? ['Curd'] : [], // Random extra
        extraCost: i === 2 ? 40 : 0,
      });
    });
  }
  return logs;
};