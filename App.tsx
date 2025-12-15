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
  MoonIcon
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

// --- PDF Generator ---
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
    onBackup,
    onRestore
}: { 
    customers: Customer[], 
    logs: DeliveryLog[],
    onBackup: () => void,
    onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => {
  const todayStr = getTodayStr();
  const todayLogs = logs.filter(l => l.date === todayStr);
  
  const totalPendingDue = useMemo(() => {
    return customers.reduce((acc, c) => {
        const cLogs = logs.filter(l => l.customerId === c.id && l.status === DeliveryStatus.DELIVERED);
        const cVal = cLogs.reduce((sum, l) => sum + (l.quantity * (c.prices[l.milkType || c.milkType] || 0)), 0);
        return acc + c.balance + cVal;
    }, 0);
  }, [customers, logs]);

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

  // Sort: Pending first, then processed
  const sortedCustomers = [...activeCustomers].sort((a, b) => {
    const logA = logs.find(l => l.customerId === a.id && l.date === selectedDate);
    const logB = logs.find(l => l.customerId === b.id && l.date === selectedDate);
    const statusA = logA ? 1 : 0;
    const statusB = logB ? 1 : 0;
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

      <div className="flex items-center justify-between mb-2 px-1">
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
        const isMissed = log?.status === DeliveryStatus.MISSED;
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

const CustomerList = ({ 
    customers, 
    onAddClick,
    onEditClick,
    onDeleteClick,
    onBackup
}: { 
    customers: Customer[], 
    onAddClick: () => void, 
    onEditClick: (c: Customer) => void,
    onDeleteClick: (id: string) => void,
    onBackup: () => void
}) => {
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

    const confirmDelete = () => {
        if (deleteId) {
            onDeleteClick(deleteId);
            setDeleteId(null);
        }
    }

    const filteredCustomers = customers.filter(c => {
        if (activeTab === 'active') return !c.isPaused;
        return c.isPaused;
    });

    return (
        <div className="space-y-4">
             <Modal 
                isOpen={!!deleteId} 
                onClose={() => setDeleteId(null)}
                title="Confirm Deletion"
            >
                <div className="text-center">
                    <p className="text-gray-600 mb-2">Are you sure you want to delete this customer?</p>
                    <p className="text-xs text-red-500 font-bold mb-4">This action cannot be undone.</p>
                    
                    <div className="bg-blue-50 p-3 rounded-xl mb-6 border border-blue-100">
                        <p className="text-xs text-blue-700 font-medium mb-2">It is recommended to backup data before deleting.</p>
                        <Button variant="outline" fullWidth onClick={onBackup} className="!py-2 text-xs bg-white border-blue-200 text-blue-700">
                            <ArrowDownTrayIcon className="w-3 h-3 mr-1"/> Backup Data
                        </Button>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" fullWidth onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" fullWidth onClick={confirmDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>

             <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-gray-800">My Customers</h2>
                <Button onClick={onAddClick} className="!py-2 !px-4 text-sm">
                    <PlusIcon className="w-4 h-4 mr-1"/> Add
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-xl">
                <button 
                    onClick={() => setActiveTab('active')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <UserGroupIcon className="w-4 h-4" />
                        Active
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('inactive')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'inactive' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <UserMinusIcon className="w-4 h-4" />
                        Inactive
                    </div>
                </button>
            </div>

            {filteredCustomers.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <p>No {activeTab} customers.</p>
                </div>
            ) : (
                filteredCustomers.map(c => (
                    <Card key={c.id}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex gap-3 items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${c.isPaused ? 'bg-gray-200 text-gray-500' : 'bg-secondary/20 text-secondary-800'}`}>
                                    {c.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{c.name}</p>
                                    <p className="text-xs text-gray-500">{c.mobile}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-sm">₹{c.balance}</p>
                                <p className="text-[10px] text-gray-400">Prev. Due</p>
                            </div>
                        </div>
                        <div className="flex gap-2 border-t border-gray-50 pt-2 mt-2 justify-end">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEditClick(c); }}
                                className="text-xs font-medium text-gray-600 flex items-center gap-1 hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-gray-50"
                            >
                                <PencilSquareIcon className="w-4 h-4" /> Edit
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setDeleteId(c.id);
                                }}
                                className="text-xs font-medium text-red-500 flex items-center gap-1 hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50 cursor-pointer z-10"
                            >
                                <TrashIcon className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    </Card>
                ))
            )}
        </div>
    )
}

const BillingView = ({ 
    customers, 
    logs, 
    paymentLogs, 
    onAddPayment 
}: { 
    customers: Customer[], 
    logs: DeliveryLog[], 
    paymentLogs: PaymentLog[],
    onAddPayment: (c: Customer, amount: number, mode: PaymentMode, date: string) => void 
}) => {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(getTodayStr());
    const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
    
    const currentMonthStart = getFirstDayOfMonth();
    const currentMonthEnd = getTodayStr();

    // Helper to calc totals for UI display (current month)
    const calculateMonthTotal = (customer: Customer) => {
        const relevantLogs = logs.filter(l => 
            l.customerId === customer.id && 
            l.date >= currentMonthStart &&
            l.date <= currentMonthEnd &&
            l.status === DeliveryStatus.DELIVERED
        );
        const totalLitres = relevantLogs.reduce((acc, l) => acc + l.quantity, 0);
        const total = relevantLogs.reduce((acc, l) => {
             const type = l.milkType || customer.milkType;
             const price = customer.prices[type] || 0;
             return acc + (l.quantity * price);
        }, 0);
        return { totalLitres, total };
    };
    
    const handlePaymentSubmit = () => {
        if (selectedCustomer && amount) {
            onAddPayment(selectedCustomer, parseFloat(amount), paymentMode, paymentDate);
            setSelectedCustomer(null);
            setAmount('');
            setPaymentMode(PaymentMode.CASH);
            setPaymentDate(getTodayStr());
            alert("Payment recorded successfully!");
        }
    };

    const handleGeneratePdf = (c: Customer) => {
        // Calculate Opening Balance for "All Time" Statement
        // Opening = Current Balance + Sum(All Payments)
        // (This formula works because Current Balance = Initial Debt - All Payments)
        // So Opening = Initial Debt.
        const allPayments = paymentLogs.filter(p => p.customerId === c.id);
        const totalPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const openingBalance = c.balance + totalPayments;

        generateAndSavePDF(c, logs, paymentLogs, "Statement", openingBalance);
    };

    return (
        <div className="space-y-4">
             {selectedCustomer && (
                <Modal 
                    isOpen={true} 
                    onClose={() => setSelectedCustomer(null)}
                    title="Add Receipt"
                >
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 mb-2">Recording payment from <span className="font-bold text-gray-800">{selectedCustomer.name}</span></p>
                        
                        <Input 
                            label="Date"
                            type="date"
                            value={paymentDate}
                            onChange={e => setPaymentDate(e.target.value)}
                        />

                        <Input 
                            label="Amount (₹)" 
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)}
                            placeholder="Enter amount"
                        />
                        
                        <Select
                            label="Payment Mode"
                            options={[
                                { label: 'Cash', value: PaymentMode.CASH },
                                { label: 'UPI / Online', value: PaymentMode.ONLINE }
                            ]}
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                        />

                        <div className="flex gap-3 mt-4">
                            <Button variant="outline" fullWidth onClick={() => setSelectedCustomer(null)}>Cancel</Button>
                            <Button fullWidth onClick={handlePaymentSubmit}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                <span className="text-gray-600 font-medium">Month</span>
                <span className="font-bold text-primary">Current Month</span>
            </div>

            {customers.map(c => {
                const { totalLitres, total } = calculateMonthTotal(c);
                const defaultPrice = c.prices[c.milkType];
                const netPayable = c.balance + total;

                return (
                    <Card key={c.id}>
                        <div className="flex justify-between border-b border-gray-100 pb-2 mb-2">
                            <h4 className="font-bold">{c.name}</h4>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                            <div>
                                <p className="text-xs text-gray-400">Litres</p>
                                <p className="font-semibold text-sm">{totalLitres}L</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Base Rate</p>
                                <p className="font-semibold text-sm">₹{defaultPrice}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Month Bill</p>
                                <p className="font-bold text-primary">₹{total}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg mb-3">
                                <div className="text-left">
                                    <span className="block text-[10px] text-gray-500">Prev. Due</span>
                                    <span className="text-sm font-semibold">₹{c.balance}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] text-gray-500">Net Receivable</span>
                                    <span className="text-lg font-bold text-gray-800">₹{netPayable}</span>
                                </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 !py-2 text-xs" onClick={() => handleGeneratePdf(c)}>
                                    <ArrowDownTrayIcon className="w-4 h-4 mr-1"/> PDF
                                </Button>
                                <Button className="flex-1 !py-2 text-xs" onClick={() => {
                                    setPaymentDate(getTodayStr());
                                    setSelectedCustomer(c);
                                }}>
                                    <DocumentTextIcon className="w-4 h-4 mr-1" /> Receipt
                                </Button>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    )
}

const ReportsView = ({ 
    customers, 
    logs, 
    paymentLogs 
}: { 
    customers: Customer[], 
    logs: DeliveryLog[], 
    paymentLogs: PaymentLog[] 
}) => {
    const [startDate, setStartDate] = useState(getFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getTodayStr());
    const [milkTypeFilter, setMilkTypeFilter] = useState<string>('All');

    const calculateTotalForRange = (customer: Customer) => {
        const relevantLogs = logs.filter(l => 
            l.customerId === customer.id && 
            l.date >= startDate &&
            l.date <= endDate &&
            l.status === DeliveryStatus.DELIVERED
        );
        const totalLitres = relevantLogs.reduce((acc, l) => acc + l.quantity, 0);
        const total = relevantLogs.reduce((acc, l) => {
             const type = l.milkType || customer.milkType;
             const price = customer.prices[type] || 0;
             return acc + (l.quantity * price);
        }, 0);
        
        return { totalLitres, total, relevantLogs };
    };

    const handleGenerateReport = (customer: Customer) => {
        const { relevantLogs } = calculateTotalForRange(customer);
        const relevantPayments = paymentLogs.filter(p => 
            p.customerId === customer.id &&
            p.date >= startDate &&
            p.date <= endDate
        );

        if (relevantLogs.length === 0 && relevantPayments.length === 0) {
            alert('No transactions found for this customer in the selected date range.');
            return;
        }

        // Calculate Opening Balance for Range
        // Logic: 
        // 1. Calculate Value of ALL delivered logs for this customer (ever).
        // 2. Calculate Value of delivered logs SINCE startDate (including range and future).
        // 3. Deliveries BEFORE start = All - SinceStart.
        // 4. Calculate Payments SINCE startDate.
        // 5. Opening = Customer.balance + PaymentsSinceStart + DeliveriesBeforeStart.
        
        // Helper to value logs
        const calcLogVal = (l: DeliveryLog) => l.quantity * (customer.prices[l.milkType || customer.milkType] || 0);
        
        // 1. All Delivered Value
        const allDeliveredLogs = logs.filter(l => l.customerId === customer.id && l.status === DeliveryStatus.DELIVERED);
        const allDeliveredValue = allDeliveredLogs.reduce((sum, l) => sum + calcLogVal(l), 0);

        // 2. Deliveries Since Start
        const logsSinceStart = allDeliveredLogs.filter(l => l.date >= startDate);
        const valSinceStart = logsSinceStart.reduce((sum, l) => sum + calcLogVal(l), 0);

        // 3. Deliveries Before Start
        const valBeforeStart = allDeliveredValue - valSinceStart;

        // 4. Payments Since Start
        const paymentsSinceStart = paymentLogs.filter(p => p.customerId === customer.id && p.date >= startDate);
        const paymentsSinceStartVal = paymentsSinceStart.reduce((sum, p) => sum + p.amount, 0);

        // 5. Opening
        const openingBalance = customer.balance + paymentsSinceStartVal + valBeforeStart;

        generateAndSavePDF(customer, relevantLogs, relevantPayments, `Bill: ${formatDate(startDate)} - ${formatDate(endDate)}`, openingBalance);
    };

    const filteredCustomers = customers.filter(c => 
        milkTypeFilter === 'All' || c.milkType === milkTypeFilter
    );

    // Calculate Grand Totals
    const grandTotals = filteredCustomers.reduce((acc, c) => {
        const stats = calculateTotalForRange(c);
        return {
            litres: acc.litres + stats.totalLitres,
            amount: acc.amount + stats.total
        };
    }, { litres: 0, amount: 0 });

    return (
        <div className="space-y-4">
             <Card className="bg-primary/5 border-primary/20">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <CalendarDaysIcon className="w-5 h-5 text-primary"/> Report Settings
                </h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                    <Select 
                        label="Filter by Milk Type"
                        value={milkTypeFilter}
                        onChange={(e) => setMilkTypeFilter(e.target.value)}
                        options={[
                            { label: 'All Types', value: 'All' },
                            { label: 'Cow', value: MilkType.COW },
                            { label: 'Buffalo', value: MilkType.BUFFALO },
                        ]}
                    />
                </div>
            </Card>

            {/* Total Summary Card */}
            <Card className="bg-white border border-gray-200 shadow-sm">
                 <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Total Summary</h4>
                 <div className="flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-400">Total Litres</p>
                        <p className="text-2xl font-bold text-primary">{grandTotals.litres.toFixed(2)} L</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Total Amount</p>
                        <p className="text-2xl font-bold text-gray-800">₹{grandTotals.amount.toFixed(2)}</p>
                    </div>
                 </div>
            </Card>

            <div className="flex justify-between items-center mt-2">
                 <h3 className="font-heading font-semibold text-lg text-gray-800">
                    Customer Reports ({filteredCustomers.length})
                 </h3>
            </div>

            {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    No customers found for selected criteria.
                </div>
            ) : (
                filteredCustomers.map(c => {
                    const { totalLitres, total } = calculateTotalForRange(c);
                    
                    return (
                        <Card key={c.id} className="flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-800">{c.name}</h4>
                                    <p className="text-xs text-gray-500">
                                        {c.milkType} • {totalLitres} Litres • ₹{total} Total
                                    </p>
                                </div>
                                <Button 
                                    variant="outline" 
                                    className="!py-1 !px-3 text-xs" 
                                    onClick={() => handleGenerateReport(c)}
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4 mr-1"/> Download
                                </Button>
                            </div>
                        </Card>
                    );
                })
            )}
        </div>
    );
};

// --- Main App Orchestrator ---

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Fake persistent data load
  useEffect(() => {
    // Generate logs on load for demo purposes
    setDeliveryLogs(generateMockLogs());
  }, []);

  const handleLogin = (role: UserRole) => {
    // Simulate user creation with hardcoded mobile/id since mobile input is removed
    const newUser: User = {
      id: 'provider-admin',
      mobile: 'ADMIN',
      role,
    };
    setUser(newUser);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
  };

  const updateDeliveryLog = (newLog: DeliveryLog) => {
    setDeliveryLogs(prev => {
      const idx = prev.findIndex(l => l.id === newLog.id);
      let updatedLogs = [...prev];
      if (idx >= 0) {
        updatedLogs[idx] = newLog;
      } else {
        updatedLogs.push(newLog);
      }
      return updatedLogs;
    });
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const handleAddPayment = (customer: Customer, amount: number, mode: PaymentMode, date: string) => {
      // 1. Add Payment Log
      const newPayment: PaymentLog = {
          id: `pay-${Date.now()}`,
          customerId: customer.id,
          date: date,
          amount: amount,
          mode: mode
      };
      setPaymentLogs(prev => [...prev, newPayment]);

      // 2. Update Customer Balance
      // Deduct the amount from the customer's balance (Due)
      setCustomers(prev => prev.map(c => {
          if (c.id === customer.id) {
              return { ...c, balance: c.balance - amount };
          }
          return c;
      }));
  };

  const handleBackup = () => {
    const data = {
        customers,
        deliveryLogs,
        paymentLogs,
        backupDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `milk_daily_backup_${getTodayStr()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target?.result as string);
            if (data.customers && data.deliveryLogs) {
                if(window.confirm('This will overwrite all current data. Are you sure?')) {
                    setCustomers(data.customers);
                    setDeliveryLogs(data.deliveryLogs);
                    setPaymentLogs(data.paymentLogs || []);
                    alert('Data restored successfully!');
                }
            } else {
                alert('Invalid backup file. Missing customers or logs.');
            }
        } catch (err) {
            alert('Error reading backup file');
            console.error(err);
        }
        // Reset input
        event.target.value = '';
    };
    reader.readAsText(file);
  };

  if (isLoading) return <SplashScreen onFinish={() => setIsLoading(false)} />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // View Routing Logic
  let content;
  let title = "Kharjul Milk Service";

  // Only Provider Views are supported now
    switch (currentView) {
      case 'dashboard':
        title = "Dashboard";
        content = <ProviderDashboard 
            customers={customers} 
            logs={deliveryLogs} 
            onBackup={handleBackup}
            onRestore={handleRestore}
        />;
        break;
      case 'daily-delivery':
        title = "Today's Route";
        content = <DailyDelivery customers={customers} logs={deliveryLogs} onUpdateLog={updateDeliveryLog} />;
        break;
      case 'customers':
        title = "Customers";
        content = <CustomerList 
            customers={customers} 
            onAddClick={() => {
                setEditingCustomer(null);
                setCurrentView('customer-form');
            }}
            onEditClick={(c) => {
                setEditingCustomer(c);
                setCurrentView('customer-form');
            }}
            onDeleteClick={handleDeleteCustomer}
            onBackup={handleBackup}
        />;
        break;
      case 'customer-form':
        title = editingCustomer ? "Edit Customer" : "Add Customer";
        content = <CustomerForm 
            initialData={editingCustomer || undefined}
            onCancel={() => setCurrentView('customers')} 
            onSave={(c) => {
                if (editingCustomer) {
                    setCustomers(customers.map(cust => cust.id === c.id ? c : cust));
                } else {
                    setCustomers([...customers, c]);
                }
                setCurrentView('customers');
            }} 
            onDelete={handleDeleteCustomer}
        />;
        break;
      case 'billing':
        title = "Billing";
        content = <BillingView customers={customers} logs={deliveryLogs} paymentLogs={paymentLogs} onAddPayment={handleAddPayment} />;
        break;
      case 'reports':
        title = "Reports";
        content = <ReportsView customers={customers} logs={deliveryLogs} paymentLogs={paymentLogs} />;
        break;
      default:
        content = <ProviderDashboard 
            customers={customers} 
            logs={deliveryLogs} 
            onBackup={handleBackup}
            onRestore={handleRestore}
        />;
    }

  return (
    <Layout 
      role={user.role} 
      currentView={currentView} 
      onChangeView={setCurrentView}
      onLogout={handleLogout}
      title={title}
    >
      {content}
    </Layout>
  );
};

export default App;