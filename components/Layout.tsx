import React from 'react';
import { UserRole } from '../types';
import { 
  HomeIcon, 
  UsersIcon, 
  ClipboardDocumentListIcon, 
  CurrencyRupeeIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  ChartBarSquareIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  title: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, role, currentView, onChangeView, onLogout, title 
}) => {
  
  const navItems = role === UserRole.PROVIDER 
    ? [
        { id: 'dashboard', label: 'Home', icon: HomeIcon },
        { id: 'daily-delivery', label: 'Delivery', icon: ClipboardDocumentListIcon },
        { id: 'customers', label: 'Customers', icon: UsersIcon },
        { id: 'billing', label: 'Billing', icon: CurrencyRupeeIcon },
        { id: 'reports', label: 'Reports', icon: ChartBarSquareIcon },
      ] 
    : [
        { id: 'customer-dashboard', label: 'Home', icon: HomeIcon },
        { id: 'history', label: 'History', icon: ClipboardDocumentListIcon },
        { id: 'request', label: 'Requests', icon: UserIcon },
      ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-primary pt-12 pb-6 px-6 rounded-b-[2rem] shadow-lg z-10 sticky top-0">
        <div className="flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold font-heading">{title}</h1>
            <p className="text-primary-100 text-sm opacity-90">Kharjul Milk Service</p>
          </div>
          <button onClick={onLogout} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      {/* Main Content (Scrollable) */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 no-scrollbar">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 flex justify-around py-3 pb-6 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};