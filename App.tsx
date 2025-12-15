import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from "jspdf";
import { 
  UserRole, 
  Customer, 
  DeliveryLog, 
  User, 
  DeliveryStatus, 
  MilkType, 
  PaymentMode,
  PaymentLog
} from './types';
import { MOCK_CUSTOMERS, generateMockLogs } from './constants';
import { Layout } from './components/Layout';
import { Button, Card, Input, Select, Badge, Modal } from './components/UIComponents';
import { 
  PlusIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  PauseCircleIcon,
  PhoneIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  QrCodeIcon,
  DocumentTextIcon,
  FunnelIcon,
  UserGroupIcon,
  UserMinusIcon,
  SunIcon,
  MoonIcon,
  ChartBarSquareIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

// --- Helper for Date ---
const getTodayStr = () => new Date().toISOString().split('T')[0];
const getFirstDayOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
};
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

// --- Helper for Price Lookup ---
const getPriceForLog = (customer: Customer, log: DeliveryLog): number => {
    const type = log.milkType || customer.milkType;
    return customer.prices[type] || 0;
};

// --- PDF Generator for Statement ---
const generateAndSavePDF = (
    customer: Customer, 
    logs: DeliveryLog[], 
    paymentLogs: PaymentLog[], 
    title: string = "Statement",
    openingBalance: number = 0
) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(46, 184, 114); // Primary Green
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Kharjul Milk Service", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(title, 105, 30, { align: "center" });

    // Customer Details
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.text("Bill To:", 20, 60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(customer.name, 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(customer.address, 20, 78);
    doc.text(`Phone: ${customer.mobile}`, 20, 86);
    
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 60);

    // Datewise Details Table Header
    let yPos = 100;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Transactions", 20, yPos);
    yPos += 5;

    // Save Y position to start drawing the border box
    const tableStartY = yPos;

    // Table Header Background
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, 170, 8, 'F');
    
    // Header Text
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Date", 25, yPos + 6);
    doc.text("Description", 55, yPos + 6);
    doc.text("Rate", 110, yPos + 6);
    doc.text("Qty", 140, yPos + 6);
    doc.text("Amount", 170, yPos + 6);
    
    yPos += 8; // Move below header
    doc.setDrawColor(200, 200, 200); // Light gray lines
    doc.line(20, yPos, 190, yPos); // Header bottom line

    // Rows
    doc.setFont("helvetica", "normal");
    
    // 1. Filter Delivery Logs
    const relevantDeliveries = logs
        .filter(l => l.customerId === customer.id && l.status === DeliveryStatus.DELIVERED);

    // 2. Filter Payment Logs
    const relevantPayments = paymentLogs
        .filter(p => p.customerId === customer.id);

    // 3. Merge and Sort
    const transactions = [
        ...relevantDeliveries.map(l => ({
            date: l.date,
            desc: `${l.milkType || customer.milkType} Milk`,
            rate: customer.prices[l.milkType || customer.milkType] || 0,
            qty: l.quantity,
            amount: l.quantity * (customer.prices[l.milkType || customer.milkType] || 0),
            type: 'DEBIT'
        })),
        ...relevantPayments.map(p => ({
            date: p.date,
            desc: `Payment (${p.mode})`,
            rate: 0,
            qty: 0,
            amount: p.amount,
            type: 'CREDIT'
        }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalDebit = 0;
    let totalCredit = 0;
    let totalLitres = 0;

    if (transactions.length === 0) {
            yPos += 6;
            doc.text("No transactions recorded in this period.", 25, yPos);
            yPos += 2;
    }

    transactions.forEach((t) => {
            if (t.type === 'DEBIT') {
                totalDebit += t.amount;
                totalLitres += t.qty;
            } else {
                totalCredit += t.amount;
            }
            
            yPos += 6; // Reduced spacing to fit more data (Compact View)

            // Date
            doc.text(formatDate(t.date), 25, yPos);
            
            // Description
            doc.text(t.desc, 55, yPos);

            if (t.type === 'DEBIT') {
                // Rate
                doc.text(`${t.rate}`, 110, yPos);
                // Qty
                doc.text(`${t.qty} L`, 140, yPos);
                // Amount
                doc.text(`${t.amount.toFixed(2)}`, 170, yPos);
            } else {
                // Payment Row styling
                doc.text("-", 110, yPos);
                doc.text("-", 140, yPos);
                doc.setTextColor(46, 184, 114); // Green for payment
                doc.text(`-${t.amount.toFixed(2)}`, 170, yPos);
                doc.setTextColor(0, 0, 0); // Reset
            }

            // Horizontal Line only
            doc.setDrawColor(230, 230, 230);
            doc.line(20, yPos + 2, 190, yPos + 2);

            // Pagination Check
            if (yPos > 270) {
                // Draw border for current page before adding new
                doc.setDrawColor(0, 0, 0);
                doc.rect(20, tableStartY, 170, yPos + 2 - tableStartY);
                
                doc.addPage();
                yPos = 20;
                // Don't redraw header on new page for simplicity in this version, or reset tableStartY
            }
    });

    // Draw Outer Border for the table
    doc.setDrawColor(100, 100, 100); // Darker border
    doc.rect(20, tableStartY, 170, (yPos + 2) - tableStartY);

    yPos += 10;

    // Totals Section
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Summary", 140, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    // Opening Balance
    doc.text(`Opening Balance: Rs. ${openingBalance.toFixed(2)}`, 140, yPos);
    yPos += 6;
    
    doc.text(`Total Litres: ${totalLitres.toFixed(1)} L`, 140, yPos);
    yPos += 6;
    doc.text(`Total Bill: Rs. ${totalDebit.toFixed(2)}`, 140, yPos);
    yPos += 6;
    doc.text(`Total Paid: Rs. ${totalCredit.toFixed(2)}`, 140, yPos);
    yPos += 6;

    // Net Receivable = Opening + Bill - Paid
    const netTotal = openingBalance + totalDebit - totalCredit;
    
    yPos += 4;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    // Red if positive (Owed), Green if negative (Advance)
    doc.setTextColor(netTotal > 0 ? 255 : 46, netTotal > 0 ? 0 : 184, netTotal > 0 ? 0 : 114); 
    doc.text(`Net Receivable: Rs. ${netTotal.toFixed(2)}`, 140, yPos);
    
    // Footer
    const footerY = 285;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100); 

    const text1 = "Developed By :- ";
    const text2 = "Hiralal Nandwani";
    const text3 = " - 8149802925 (Subscription starts just from Rs. 1/- perday)";
    
    doc.setFont("helvetica", "normal");
    const w1 = doc.getTextWidth(text1);
    const w3 = doc.getTextWidth(text3);
    
    doc.setFont("helvetica", "bold");
    const w2 = doc.getTextWidth(text2);
    
    const totalW = w1 + w2 + w3;
    let currentX = (210 - totalW) / 2;
    
    // Draw text parts
    doc.setFont("helvetica", "normal");
    doc.text(text1, currentX, footerY);
    currentX += w1;
    
    doc.setFont("helvetica", "bold");
    doc.text(text2, currentX, footerY);
    currentX += w2;
    
    doc.setFont("helvetica", "normal");
    doc.text(text3, currentX, footerY);

    doc.save(`Statement_${customer.name}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// --- PDF Generator for Receipts Report ---
const generateReceiptsPDF = (
    payments: PaymentLog[], 
    customers: Customer[], 
    startDate: string, 
    endDate: string
) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(46, 184, 114); // Primary Green
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Kharjul Milk Service", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Receipts Report (${formatDate(startDate)} - ${formatDate(endDate)})`, 105, 24, { align: "center" });

    doc.setTextColor(0, 0, 0);
    let yPos = 40;
    
    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Date", 25, yPos + 6);
    doc.text("Customer Name", 60, yPos + 6);
    doc.text("Mode", 140, yPos + 6);
    doc.text("Amount", 170, yPos + 6);
    
    yPos += 10;
    doc.setFont("helvetica", "normal");

    let totalCollected = 0;

    payments.forEach(p => {
        const c = customers.find(cust => cust.id === p.customerId);
        totalCollected += p.amount;

        doc.text(formatDate(p.date), 25, yPos);
        doc.text(c?.name || "Unknown", 60, yPos);
        doc.text(p.mode, 140, yPos);
        doc.text(p.amount.toFixed(2), 170, yPos);
        
        doc.setDrawColor(230, 230, 230);
        doc.line(20, yPos + 2, 190, yPos + 2);
        
        yPos += 8;

        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
    });

    // Total Footer
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Total Collected:", 140, yPos);
    doc.setTextColor(46, 184, 114);
    doc.text(`Rs. ${totalCollected.toFixed(2)}`, 170, yPos);

    doc.save(`Receipts_${startDate}_to_${endDate}.pdf`);
};

// --- Sub-Views ---

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="h-screen w-full bg-primary flex flex-col items-center justify-center text-white">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce">
        <span className="text-4xl">🥛</span>
      </div>
      <h1 className="text-3xl font-bold font-heading mb-2">Kharjul Milk Service</h1>
      <p className="opacity-80">Freshness at your doorstep</p>
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (role: UserRole) => void }) => {
  const [pin, setPin] = useState('');

  const handleVerify = () => {
    if (pin === '9090') onLogin(UserRole.PROVIDER);
    else alert('Invalid PIN');
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col justify-center max-w-md mx-auto">
      <div className="mb-10 text-center">
        <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
            <span className="text-4xl">🐄</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Developed By</h2>
        <p className="text-gray-500 font-medium">Hiralal Nandwani - 8149802925</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <Input 
            label="Enter PIN" 
            type="password"
            placeholder="****" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={4}
            className="text-center text-2xl tracking-widest"
        />
        <Button fullWidth onClick={handleVerify} disabled={pin.length !== 4}>
            Login
        </Button>
      </div>
    </div>
  );
};

// --- Provider Views ---

const ProviderDashboard = ({ 
    customers, 
    logs,
    payments,
    onBackup,
    onRestore
}: { 
    customers: Customer[], 
    logs: DeliveryLog[],
    payments: PaymentLog[],
    onBackup: () => void,
    onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => {
  const todayStr = getTodayStr();
  const todayLogs = logs.filter(l => l.date === todayStr);
  
  const totalPendingDue = useMemo(() => {
    return customers.reduce((acc, c) => {
        const cLogs = logs.filter(l => l.customerId === c.id && l.status === DeliveryStatus.DELIVERED);
        const cVal = cLogs.reduce((sum, l) => sum + (l.quantity * (c.prices[l.milkType || c.milkType] || 0)), 0);
        const cPaid = payments.filter(p => p.customerId === c.id).reduce((sum, p) => sum + p.amount, 0);
        return acc + c.balance + cVal - cPaid;
    }, 0);
  }, [customers, logs, payments]);

  const deliveredCount = todayLogs.filter(l => l.status === DeliveryStatus.DELIVERED).length;
  // Count inactive customers for the dashboard card
  const inactiveCount = customers.filter(c => c.isPaused).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <p className="text-blue-600 text-xs font-bold uppercase">Total Customers</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{customers.length}</p>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <p className="text-red-600 text-xs font-bold uppercase">Pending Due</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">₹{totalPendingDue.toFixed(0)}</p>
        </Card>
      </div>

      <h3 className="font-heading font-semibold text-lg mt-4 text-gray-800">Today's Overview</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-xs">Delivered</p>
                <p className="text-xl font-bold text-primary">{deliveredCount}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-primary/20" />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-xs">Remaining (Inactive)</p>
                <p className="text-xl font-bold text-gray-500">{inactiveCount}</p>
            </div>
            <PauseCircleIcon className="w-8 h-8 text-gray-200" />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-heading font-semibold text-lg text-gray-800">Recent Activity</h3>
            <span className="text-xs text-primary font-medium">View All</span>
        </div>
        {logs.slice(0, 3).map(log => {
            const customer = customers.find(c => c.id === log.customerId);
            return (
                <div key={log.id} className="bg-white p-3 rounded-xl mb-3 flex justify-between items-center shadow-sm">
                    <div>
                        <p className="font-semibold text-sm">{customer?.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(log.date)} • {log.quantity}L</p>
                    </div>
                    <Badge status={log.status} />
                </div>
            )
        })}
      </div>

      {/* Data Management Section */}
      <Card className="mt-6 border-gray-200">
          <h3 className="font-heading font-semibold text-lg text-gray-800 mb-3 flex items-center gap-2">
            Data Management
          </h3>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={onBackup} className="!py-2 text-sm">
               <ArrowDownTrayIcon className="w-4 h-4 mr-1"/> Backup
            </Button>
            <label className="flex-1">
               <div className="px-6 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-2 border-primary text-primary hover:bg-primary/5 cursor-pointer text-sm h-full">
                  <ArrowUpTrayIcon className="w-4 h-4 mr-1"/> Restore
               </div>
               <input type="file" accept=".json" className="hidden" onChange={onRestore} />
            </label>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Backup often to avoid data loss. Restoring will overwrite current data.
          </p>
      </Card>
    </div>
  );
};

const CustomerForm = ({ 
    initialData, 
    onSave, 
    onCancel,
    onDelete 
}: { 
    initialData?: Customer, 
    onSave: (c: Customer) => void, 
    onCancel: () => void, 
    onDelete: (id: string) => void
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>(initialData || {
    milkType: MilkType.COW,
    deliveryTime: 'Morning',
    paymentMode: PaymentMode.CASH,
    startDate: getTodayStr(),
    defaultQuantity: 1,
    prices: {
        [MilkType.COW]: 60,
        [MilkType.BUFFALO]: 70
    },
    balance: 0,
    isPaused: false
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.mobile) return alert('Name and Mobile are required');
    
    // Ensure prices object exists
    const prices = formData.prices || {
        [MilkType.COW]: 60,
        [MilkType.BUFFALO]: 70
    };

    // Maintain existing ID if editing, otherwise create new
    const id = initialData?.id || Date.now().toString();
    const balance = formData.balance !== undefined ? formData.balance : 0;
    const isPaused = formData.isPaused !== undefined ? formData.isPaused : false;

    onSave({
      ...formData as Customer,
      id,
      balance,
      isPaused,
      prices
    });
  };

  const updatePrice = (type: MilkType, price: number) => {
    setFormData(prev => ({
        ...prev,
        prices: {
            ...prev.prices,
            [type]: price
        } as Record<MilkType, number>
    }));
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">{initialData ? 'Edit Customer' : 'New Customer'}</h2>
            <button onClick={onCancel} className="text-gray-400">Cancel</button>
        </div>
      <Card>
        <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg">
             <span className="font-bold text-gray-700">Status</span>
             <div className="flex items-center gap-2">
                 <span className={`text-sm ${!formData.isPaused ? 'text-primary font-bold' : 'text-gray-400'}`}>Active</span>
                 <button 
                    onClick={() => setFormData(prev => ({...prev, isPaused: !prev.isPaused}))}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.isPaused ? 'bg-gray-300' : 'bg-primary'}`}
                 >
                     <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.isPaused ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
                 <span className={`text-sm ${formData.isPaused ? 'text-gray-700 font-bold' : 'text-gray-400'}`}>Inactive</span>
             </div>
        </div>

        <Input label="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
        <Input label="Mobile" type="tel" value={formData.mobile || ''} onChange={e => setFormData({...formData, mobile: e.target.value})} />
        <Input label="Address" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
        
        {/* Previous Due / Balance Editable Field */}
        <Input 
            label="Previous Due / Opening Balance (₹)" 
            type="number" 
            value={formData.balance} 
            onChange={e => setFormData({...formData, balance: parseFloat(e.target.value)})} 
        />

        <div className="grid grid-cols-2 gap-4">
            <Select 
            label="Default Milk Type" 
            options={Object.values(MilkType).map(t => ({label: t, value: t}))}
            value={formData.milkType} 
            onChange={e => setFormData({...formData, milkType: e.target.value as MilkType})} 
            />
            <Input 
                label="Default Qty (L)" 
                type="number" 
                step="0.25"
                value={formData.defaultQuantity} 
                onChange={e => setFormData({...formData, defaultQuantity: parseFloat(e.target.value)})} 
            />
        </div>

        {/* Milk Prices Section */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-3">Milk Prices (₹/L)</label>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <span className="text-xs text-gray-500 font-medium ml-1">Cow</span>
                    <input 
                        type="number" 
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none"
                        value={formData.prices?.[MilkType.COW]}
                        onChange={e => updatePrice(MilkType.COW, parseFloat(e.target.value))}
                    />
                </div>
                <div className="space-y-1">
                    <span className="text-xs text-gray-500 font-medium ml-1">Buffalo</span>
                    <input 
                        type="number" 
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none"
                        value={formData.prices?.[MilkType.BUFFALO]}
                        onChange={e => updatePrice(MilkType.BUFFALO, parseFloat(e.target.value))}
                    />
                </div>
            </div>
        </div>

        <Select 
            label="Time" 
            options={[{label: 'Morning', value: 'Morning'}, {label: 'Evening', value: 'Evening'}]}
            value={formData.deliveryTime} 
            onChange={e => setFormData({...formData, deliveryTime: e.target.value as 'Morning' | 'Evening'})} 
        />
        
        <Button fullWidth onClick={handleSubmit} className="mb-3">
            {initialData ? 'Update Customer' : 'Add Customer'}
        </Button>
        
        {initialData && (
             <Button 
                variant="danger" 
                fullWidth 
                onClick={() => onDelete(initialData.id)}
                className="mt-2"
            >
                <TrashIcon className="w-5 h-5"/> 
                <span className="font-bold">Delete Customer</span>
            </Button>
        )}
      </Card>
    </div>
  );
};

const DailyDelivery = ({ customers, logs, onUpdateLog }: { customers: Customer[], logs: DeliveryLog[], onUpdateLog: (log: DeliveryLog) => void }) => {
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedTime, setSelectedTime] = useState<'Morning' | 'Evening'>('Morning');
  const [editingLog, setEditingLog] = useState<{customer: Customer, qty: number, milkType: MilkType} | null>(null);

  const handleStatusChange = (customer: Customer, status: DeliveryStatus, customQty?: number, customMilkType?: MilkType) => {
    const existingLog = logs.find(l => l.customerId === customer.id && l.date === selectedDate);
    
    // Handle Unselecting / Toggling off
    if (existingLog && existingLog.status === status && customQty === undefined && customMilkType === undefined) {
        // If clicking the same status again (and not editing via modal), revert to Pending/Unselected
        const newLog: DeliveryLog = {
            ...existingLog,
            status: DeliveryStatus.PENDING
        };
        onUpdateLog(newLog);
        return;
    }

    const quantity = customQty !== undefined ? customQty : (existingLog ? existingLog.quantity : customer.defaultQuantity);
    const milkType = customMilkType !== undefined ? customMilkType : (existingLog?.milkType || customer.milkType);
    
    const newLog: DeliveryLog = {
      id: existingLog ? existingLog.id : `${customer.id}-${selectedDate}`,
      customerId: customer.id,
      date: selectedDate,
      status: status,
      quantity: quantity,
      milkType: milkType, // Save the milk type for this delivery
      extras: existingLog ? existingLog.extras : [],
      extraCost: existingLog ? existingLog.extraCost : 0,
    };
    onUpdateLog(newLog);
  };

  const handleEditSave = () => {
    if (editingLog) {
        handleStatusChange(editingLog.customer, DeliveryStatus.DELIVERED, editingLog.qty, editingLog.milkType);
        setEditingLog(null);
    }
  };

  // Filter out Inactive customers (isPaused = true) AND filter by delivery time
  const activeCustomers = customers.filter(c => !c.isPaused && c.deliveryTime === selectedTime);

  // Calculate Shift Stats (Remaining / Total)
  const shiftStats = useMemo(() => {
    const stats = {
        [MilkType.COW]: { total: 0, delivered: 0 },
        [MilkType.BUFFALO]: { total: 0, delivered: 0 }
    };

    // 1. Calculate Planned Total (Based on default settings of customers in this shift)
    activeCustomers.forEach(c => {
        if (stats[c.milkType]) {
            stats[c.milkType].total += c.defaultQuantity;
        }
    });

    // 2. Calculate Actual Delivered (Based on logs)
    activeCustomers.forEach(c => {
        const log = logs.find(l => l.customerId === c.id && l.date === selectedDate);
        
        // Only count towards consumption if status is DELIVERED
        if (log && log.status === DeliveryStatus.DELIVERED) {
            // Use the actual milk type used in the log (in case of override)
            const type = log.milkType || c.milkType;
            if (stats[type]) {
                stats[type].delivered += log.quantity;
            }
        }
    });

    return {
        [MilkType.COW]: { 
            total: stats[MilkType.COW].total, 
            remaining: stats[MilkType.COW].total - stats[MilkType.COW].delivered 
        },
        [MilkType.BUFFALO]: { 
            total: stats[MilkType.BUFFALO].total, 
            remaining: stats[MilkType.BUFFALO].total - stats[MilkType.BUFFALO].delivered 
        }
    };
  }, [activeCustomers, logs, selectedDate]);


  // Sort: Pending first, then processed
  const sortedCustomers = [...activeCustomers].sort((a, b) => {
    const logA = logs.find(l => l.customerId === a.id && l.date === selectedDate);
    const logB = logs.find(l => l.customerId === b.id && l.date === selectedDate);
    const statusA = (logA && logA.status !== DeliveryStatus.PENDING) ? 1 : 0;
    const statusB = (logB && logB.status !== DeliveryStatus.PENDING) ? 1 : 0;
    return statusA - statusB;
  });

  return (
    <div className="space-y-4">
      {editingLog && (
        <Modal 
            isOpen={true} 
            onClose={() => setEditingLog(null)} 
            title={`Edit Delivery - ${editingLog.customer.name}`}
        >
            <div className="space-y-4">
                <Input 
                    label="Quantity (L)" 
                    type="number" 
                    step="0.25"
                    value={editingLog.qty} 
                    onChange={(e) => setEditingLog({...editingLog, qty: parseFloat(e.target.value)})}
                    autoFocus
                />
                <Select 
                    label="Milk Type"
                    value={editingLog.milkType}
                    onChange={(e) => setEditingLog({...editingLog, milkType: e.target.value as MilkType})}
                    options={[
                        { label: 'Cow', value: MilkType.COW },
                        { label: 'Buffalo', value: MilkType.BUFFALO },
                    ]}
                />
                <Button fullWidth onClick={handleEditSave}>Save Changes</Button>
            </div>
        </Modal>
      )}

      {/* Date Selection Header */}
      <Card className="bg-primary/5 border-primary/20 p-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-primary"/>
                  <span className="font-bold text-gray-700">Delivery Date</span>
               </div>
               <input
                 type="date"
                 value={selectedDate}
                 max={getTodayStr()}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-primary bg-white"
               />
            </div>
            
            {/* Time/Shift Selector */}
             <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/10">
                <span className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                    {selectedTime === 'Morning' ? <SunIcon className="w-5 h-5 text-orange-500"/> : <MoonIcon className="w-5 h-5 text-indigo-500"/>}
                    Shift
                </span>
                <div className="flex bg-white rounded-lg p-1 border border-primary/20">
                    <button 
                        onClick={() => setSelectedTime('Morning')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedTime === 'Morning' ? 'bg-orange-100 text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Morning
                    </button>
                    <button 
                        onClick={() => setSelectedTime('Evening')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedTime === 'Evening' ? 'bg-indigo-100 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Evening
                    </button>
                </div>
            </div>
          </div>
      </Card>

      {/* Milk Quantity Stats */}
      <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cow (Rem/Total)</span>
                 <div className="text-lg font-bold text-gray-800">
                    <span className="text-blue-600">{shiftStats[MilkType.COW].remaining}</span>
                    <span className="text-gray-400 text-sm"> / {shiftStats[MilkType.COW].total} L</span>
                 </div>
            </div>
            <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Buffalo (Rem/Total)</span>
                 <div className="text-lg font-bold text-gray-800">
                    <span className="text-blue-600">{shiftStats[MilkType.BUFFALO].remaining}</span>
                    <span className="text-gray-400 text-sm"> / {shiftStats[MilkType.BUFFALO].total} L</span>
                 </div>
            </div>
      </div>

      <div className="flex items-center justify-between mb-2 px-1 pt-2">
        <h2 className="text-lg font-bold text-gray-800">
           {selectedDate === getTodayStr() ? "Today's Route" : `Route for ${formatDate(selectedDate)}`}
        </h2>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Active: {activeCustomers.length}</span>
      </div>

      {sortedCustomers.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
              <p>No active customers found for {selectedTime} shift.</p>
          </div>
      ) : sortedCustomers.map(customer => {
        const log = logs.find(l => l.customerId === customer.id && l.date === selectedDate);
        const isDelivered = log?.status === DeliveryStatus.DELIVERED;
        // Default visual state is Missed (Red) if not delivered.
        const isMissed = !isDelivered;
        const currentQty = log ? log.quantity : customer.defaultQuantity;
        // Current delivery milk type or default customer milk type
        const currentMilkType = log?.milkType || customer.milkType;

        return (
          <Card key={customer.id} className={`flex flex-col gap-3 transition-colors ${isDelivered ? 'bg-green-50 border-green-200' : isMissed ? 'bg-red-50' : 'bg-white'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-gray-800">{customer.name}</h4>
                <p className="text-xs text-gray-500">{customer.address}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{currentMilkType}</span>
                  <span className="text-xs font-semibold text-primary">{currentQty}L</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleStatusChange(customer, DeliveryStatus.DELIVERED)}
                  className={`p-2 rounded-full transition-colors ${isDelivered ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}
                >
                  <CheckCircleIcon className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => handleStatusChange(customer, DeliveryStatus.MISSED)}
                  className={`p-2 rounded-full transition-colors ${isMissed ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-1 border-t border-gray-100 pt-2">
                 <button 
                    onClick={() => setEditingLog({ customer, qty: currentQty, milkType: currentMilkType })}
                    className="text-xs text-primary font-bold ml-auto flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm border border-gray-100 hover:bg-gray-50"
                 >
                    <PencilSquareIcon className="w-3 h-3"/> Edit
                 </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const CustomerList = ({ customers, onEdit, onDelete, onAddNew }: { customers: Customer[], onEdit: (c: Customer) => void, onDelete: (id: string) => void, onAddNew: () => void }) => {
    const [search, setSearch] = useState('');
    const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search));

    return (
        <div className="space-y-4">
             <div className="flex gap-2">
                <div className="relative flex-1">
                    <input 
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-primary"
                        placeholder="Search customers..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                        <MagnifyingGlassIcon className="w-5 h-5" />
                    </div>
                </div>
                <Button onClick={onAddNew} className="!px-4"><PlusIcon className="w-5 h-5"/></Button>
             </div>
             
             {filtered.map(c => (
                 <Card key={c.id} onClick={() => onEdit(c)}>
                     <div className="flex justify-between items-start">
                         <div>
                             <h4 className="font-bold text-gray-800">{c.name}</h4>
                             <p className="text-xs text-gray-500">{c.mobile}</p>
                             <p className="text-xs text-gray-500 mt-1">{c.address}</p>
                         </div>
                         <div className="text-right">
                             <Badge status={c.isPaused ? 'Paused' : 'Active'} />
                             <p className="text-xs font-bold text-primary mt-2">{c.defaultQuantity} L / day</p>
                         </div>
                     </div>
                 </Card>
             ))}
        </div>
    )
};

const BillingView = ({ customers, logs, payments, onAddPayment }: { customers: Customer[], logs: DeliveryLog[], payments: PaymentLog[], onAddPayment: (p: PaymentLog) => void }) => {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(getTodayStr());
    const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
    
    // Helper to calculate total due for a customer based on logs
    const calculateDue = (c: Customer) => {
        const cLogs = logs.filter(l => l.customerId === c.id && l.status === DeliveryStatus.DELIVERED);
        const billAmount = cLogs.reduce((sum, l) => sum + (l.quantity * (c.prices[l.milkType || c.milkType] || 0)), 0);
        const cPayments = payments.filter(p => p.customerId === c.id);
        const paidAmount = cPayments.reduce((sum, p) => sum + p.amount, 0);
        return c.balance + billAmount - paidAmount;
    }

    const handlePayment = () => {
        if(!selectedCustomer || !paymentAmount) return;
        onAddPayment({
            id: Date.now().toString(),
            customerId: selectedCustomer.id,
            date: paymentDate,
            amount: parseFloat(paymentAmount),
            mode: paymentMode
        });
        setPaymentAmount('');
        setPaymentDate(getTodayStr());
        setSelectedCustomer(null);
    };

    return (
        <div className="space-y-4">
            {selectedCustomer && (
                <Modal isOpen={true} onClose={() => setSelectedCustomer(null)} title="Record Payment">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">Collecting payment from <span className="font-bold">{selectedCustomer.name}</span></p>
                        <Input label="Date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                        <Input label="Amount (₹)" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} autoFocus />
                        <Select label="Mode" options={[{label: 'Cash', value: 'Cash'}, {label: 'Online', value: 'Online'}]} value={paymentMode} onChange={e => setPaymentMode(e.target.value as PaymentMode)} />
                        <Button fullWidth onClick={handlePayment}>Save Payment</Button>
                    </div>
                </Modal>
            )}

            {customers.map(c => {
                const due = calculateDue(c);
                return (
                    <Card key={c.id} className="flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-gray-800">{c.name}</h4>
                                <p className="text-sm font-bold text-red-500">Due: ₹{due.toFixed(2)}</p>
                            </div>
                            <button onClick={() => setSelectedCustomer(c)} className="bg-primary/10 text-primary p-2 rounded-lg hover:bg-primary/20">
                                <BanknotesIcon className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" className="flex-1 !py-2 text-xs" onClick={() => generateAndSavePDF(c, logs, payments, "Statement", c.balance)}>
                                <DocumentTextIcon className="w-4 h-4"/> Statement
                             </Button>
                             <a href={`https://wa.me/91${c.mobile}?text=Hello ${c.name}, your current outstanding milk bill is Rs. ${due.toFixed(2)}. Please pay at your earliest convenience.`} target="_blank" rel="noreferrer" className="flex-1">
                                <Button variant="secondary" className="w-full !py-2 text-xs">
                                    <PhoneIcon className="w-4 h-4"/> WhatsApp
                                </Button>
                             </a>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

const ReportsView = ({ 
    customers, 
    payments, 
    onUpdatePayment,
    onDeletePayment 
}: { 
    customers: Customer[], 
    payments: PaymentLog[],
    onUpdatePayment: (p: PaymentLog) => void,
    onDeletePayment: (id: string) => void
}) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [startDate, setStartDate] = useState(getFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getTodayStr());
    const [editingPayment, setEditingPayment] = useState<PaymentLog | null>(null);

    const filteredPayments = payments.filter(p => {
        if (selectedCustomerId && p.customerId !== selectedCustomerId) return false;
        if (p.date < startDate || p.date > endDate) return false;
        return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPaid = filteredPayments.reduce((acc, curr) => acc + curr.amount, 0);

    const handleEditSave = () => {
        if (editingPayment) {
            onUpdatePayment(editingPayment);
            setEditingPayment(null);
        }
    }

    return (
        <div className="space-y-4">
             {editingPayment && (
                <Modal 
                    isOpen={true} 
                    onClose={() => setEditingPayment(null)}
                    title="Edit Receipt"
                >
                    <div className="space-y-3">
                        <Input 
                            label="Date"
                            type="date"
                            value={editingPayment.date}
                            onChange={e => setEditingPayment({...editingPayment, date: e.target.value})}
                        />
                        <Input 
                            label="Amount (₹)" 
                            type="number" 
                            value={editingPayment.amount} 
                            onChange={e => setEditingPayment({...editingPayment, amount: parseFloat(e.target.value)})}
                        />
                        <Select
                            label="Mode"
                            options={[
                                { label: 'Cash', value: PaymentMode.CASH },
                                { label: 'Online', value: 'Online' }
                            ]}
                            value={editingPayment.mode}
                            onChange={(e) => setEditingPayment({...editingPayment, mode: e.target.value as PaymentMode})}
                        />
                        <Button fullWidth onClick={handleEditSave}>Save Changes</Button>
                    </div>
                </Modal>
            )}

            <Card className="bg-white">
                <div className="space-y-4">
                    <Select 
                        label="Customer"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        options={[
                            { label: 'All Customers', value: '' },
                            ...customers.map(c => ({ label: c.name, value: c.id }))
                        ]}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Input 
                            label="Start Date" 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                        />
                        <Input 
                            label="End Date" 
                            type="date" 
                            value={endDate}
                            max={getTodayStr()}
                            onChange={(e) => setEndDate(e.target.value)} 
                        />
                    </div>
                    <Button 
                        fullWidth 
                        onClick={() => generateReceiptsPDF(filteredPayments, customers, startDate, endDate)}
                        className="!mt-2"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" /> Download Report (PDF)
                    </Button>
                </div>
            </Card>

            <div className="flex justify-between items-center bg-green-50 p-3 rounded-xl border border-green-100">
               <span className="text-sm font-bold text-green-800">Total Collected</span>
               <span className="text-lg font-bold text-green-600">₹{totalPaid}</span>
            </div>

            <div className="space-y-2">
                <h3 className="font-bold text-gray-700">Receipts History</h3>
                {filteredPayments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No receipts found.</div>
                ) : (
                    filteredPayments.map(p => {
                        const c = customers.find(cust => cust.id === p.customerId);
                        return (
                            <Card key={p.id} className="flex justify-between items-center relative">
                                <div>
                                    <p className="font-bold text-gray-800">{c?.name || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500">{formatDate(p.date)} • {p.mode}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-green-600">+₹{p.amount}</span>
                                    <div className="flex gap-1">
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingPayment(p);
                                            }}
                                            className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:text-primary z-10"
                                        >
                                            <PencilSquareIcon className="w-5 h-5"/>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeletePayment(p.id);
                                            }}
                                            className="p-2 bg-red-50 rounded-lg text-red-500 hover:bg-red-100 z-10"
                                        >
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    );
};

const App = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null); // In real app, persist this
  const [view, setView] = useState('dashboard');
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  
  // Modal States
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  
  // Delete Confirmation State
  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
      // Simulate data fetching
      const loadedLogs = generateMockLogs();
      setLogs(loadedLogs);
      // setPayments([]); // Already empty
  }, []);

  const handleLogin = (role: UserRole) => {
      setUser({ id: '1', mobile: '0000', role });
      setLoading(false);
  };

  const handleBackup = () => {
      const data = { customers, logs, payments };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${getTodayStr()}.json`;
      a.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              try {
                  const data = JSON.parse(event.target?.result as string);
                  if (data.customers) setCustomers(data.customers);
                  if (data.logs) setLogs(data.logs);
                  if (data.payments) setPayments(data.payments);
                  alert('Data restored successfully!');
              } catch (err) {
                  alert('Invalid backup file');
              }
          };
          reader.readAsText(file);
      }
  };

  // --- Payment State Handlers ---
  const handleUpdatePayment = (updatedPayment: PaymentLog) => {
      setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
  };

  const handleDeletePayment = (id: string) => {
      setConfirmModal({
        isOpen: true,
        title: 'Delete Receipt',
        message: 'Have you taken a backup? Deleting this receipt is permanent and cannot be undone.',
        onConfirm: () => {
             setPayments(prev => prev.filter(p => p.id !== id));
             closeConfirm();
        }
      });
  };

  if (loading) return <SplashScreen onFinish={() => setLoading(false)} />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const renderContent = () => {
      switch (view) {
          case 'dashboard':
              return <ProviderDashboard customers={customers} logs={logs} payments={payments} onBackup={handleBackup} onRestore={handleRestore} />;
          case 'daily-delivery':
              return <DailyDelivery customers={customers} logs={logs} onUpdateLog={(newLog) => {
                  setLogs(prev => {
                      const idx = prev.findIndex(l => l.id === newLog.id);
                      if (idx >= 0) {
                          const updated = [...prev];
                          updated[idx] = newLog;
                          return updated;
                      }
                      return [...prev, newLog];
                  });
              }} />;
          case 'customers':
              if (showCustomerForm) {
                  return <CustomerForm 
                      initialData={editingCustomer} 
                      onCancel={() => { setShowCustomerForm(false); setEditingCustomer(undefined); }}
                      onSave={(c) => {
                          setCustomers(prev => {
                              const exists = prev.find(cust => cust.id === c.id);
                              if (exists) return prev.map(cust => cust.id === c.id ? c : cust);
                              return [...prev, c];
                          });
                          setShowCustomerForm(false);
                          setEditingCustomer(undefined);
                      }}
                      onDelete={(id) => {
                           setConfirmModal({
                               isOpen: true,
                               title: 'Delete Customer',
                               message: 'Have you taken a backup? This will delete the customer and cannot be undone.',
                               onConfirm: () => {
                                   setCustomers(prev => prev.filter(c => c.id !== id));
                                   setShowCustomerForm(false);
                                   setEditingCustomer(undefined);
                                   closeConfirm();
                               }
                           });
                      }}
                  />;
              }
              return <CustomerList 
                  customers={customers} 
                  onAddNew={() => { setEditingCustomer(undefined); setShowCustomerForm(true); }}
                  onEdit={(c) => { setEditingCustomer(c); setShowCustomerForm(true); }}
                  onDelete={(id) => setCustomers(prev => prev.filter(c => c.id !== id))}
              />;
          case 'billing':
              return <BillingView 
                  customers={customers} 
                  logs={logs} 
                  payments={payments}
                  onAddPayment={(p) => setPayments(prev => [...prev, p])}
              />;
           case 'reports':
               return <ReportsView 
                   customers={customers} 
                   payments={payments} 
                   onUpdatePayment={handleUpdatePayment}
                   onDeletePayment={handleDeletePayment}
               />;
          default:
              return <div className="p-4">Not Found</div>;
      }
  };

  return (
    <Layout 
        role={user.role} 
        currentView={view} 
        onChangeView={(v) => { 
            setView(v); 
            // Reset customer form state when switching views
            setShowCustomerForm(false);
        }} 
        onLogout={() => setUser(null)}
        title={view === 'dashboard' ? 'Dashboard' : view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')}
    >
        {renderContent()}
        
        {/* Global Delete Confirmation Modal */}
        <Modal 
            isOpen={confirmModal.isOpen} 
            onClose={closeConfirm} 
            title={confirmModal.title}
        >
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-gray-600">{confirmModal.message}</p>
                
                {/* Backup Button inside Confirmation */}
                <Button variant="secondary" fullWidth onClick={handleBackup} className="mb-2">
                    <ArrowDownTrayIcon className="w-5 h-5" /> Backup Data First
                </Button>

                <div className="flex gap-3 w-full">
                    <Button variant="outline" fullWidth onClick={closeConfirm}>
                        Cancel
                    </Button>
                    <Button variant="danger" fullWidth onClick={confirmModal.onConfirm}>
                        Yes, Delete
                    </Button>
                </div>
            </div>
        </Modal>
    </Layout>
  );
};

export default App;