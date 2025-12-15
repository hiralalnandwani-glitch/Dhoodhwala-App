import React from 'react';

// --- Card ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}
export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className} ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
  >
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
}
export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', fullWidth = false, className = '', ...props 
}) => {
  const baseStyle = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-primary text-white hover:bg-[#259b60] shadow-md shadow-primary/20",
    secondary: "bg-secondary text-gray-900 hover:bg-[#e6c200]",
    outline: "border-2 border-primary text-primary hover:bg-primary/5",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };
  
  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className} disabled:opacity-50`}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">{label}</label>
    <input 
      className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${className}`}
      {...props}
    />
  </div>
);

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { label: string; value: string | number }[];
}
export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">{label}</label>
    <div className="relative">
      <select 
        className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none bg-white ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

// --- Badge ---
export const Badge: React.FC<{ status: string }> = ({ status }) => {
  let colorClass = "bg-gray-100 text-gray-600";
  if (status === 'Delivered') colorClass = "bg-green-100 text-green-700";
  if (status === 'Pending') colorClass = "bg-yellow-100 text-yellow-700";
  if (status === 'Missed') colorClass = "bg-red-100 text-red-700";
  if (status === 'Paused') colorClass = "bg-gray-200 text-gray-500";
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};

// --- Modal ---
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
         <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
         </div>
         <div className="p-4">
            {children}
         </div>
      </div>
    </div>
  );
};