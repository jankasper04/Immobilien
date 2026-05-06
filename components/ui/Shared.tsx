import React from 'react';
import { ChevronDown, Search, Loader2, AlertTriangle, CheckCircle, Info, XCircle, Bell } from 'lucide-react';
import { AppNotification } from '../../types';

// --- Premium Select Component ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const FancySelect = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, icon, className, children, containerClassName, ...props }, ref) => {
    return (
      <div className={`relative group ${containerClassName}`}>
        {label && (
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">
            {label}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-blue-500">
            {icon}
          </div>
          <select
            ref={ref}
            className={`w-full appearance-none bg-white border border-slate-200 text-slate-900 text-sm font-medium rounded-xl py-3 ${icon ? 'pl-10' : 'pl-4'} pr-10 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300 transition-all duration-200 cursor-pointer ${className}`}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
            <ChevronDown size={16} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    );
  }
);

// --- Premium Input Component ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
  rightElement?: React.ReactNode;
}

export const FancyInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, className, containerClassName, rightElement, ...props }, ref) => {
    return (
      <div className={`relative group ${containerClassName}`}>
        {label && (
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-blue-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-white border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl py-3 ${icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-12' : 'pr-4'} shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300 transition-all duration-200 placeholder:text-slate-300 placeholder:font-normal ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightElement}
            </div>
          )}
        </div>
      </div>
    );
  }
);

// --- Premium Button Component ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const FancyButton = ({ variant = 'primary', size = 'md', isLoading, icon, children, className, ...props }: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none gap-2";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30",
    secondary: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    outline: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    ghost: "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-5 py-2.5",
    lg: "text-base px-6 py-3",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`} {...props}>
      {isLoading && <Loader2 size={16} className="animate-spin" />}
      {!isLoading && icon}
      {children}
    </button>
  );
};

// --- Modal Wrapper ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children?: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {title}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-all">
            <Search size={0} className="hidden"/> {/* Dummy for import check */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="max-h-[85vh] overflow-y-auto">
            {children}
        </div>
      </div>
    </div>
  );
}

// --- Confirm Dialog ---
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, description, confirmText = "Löschen", cancelText = "Abbrechen" }: ConfirmDialogProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-red-100 border border-red-50">
        <div className="p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm mb-6">{description}</p>
            <div className="flex gap-3 justify-center">
                <FancyButton variant="ghost" onClick={onClose}>{cancelText}</FancyButton>
                <FancyButton variant="danger" onClick={() => { onConfirm(); onClose(); }}>{confirmText}</FancyButton>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Toast Component ---
export const Toast = ({ notification }: { notification: AppNotification | null }) => {
    if (!notification) return null;

    const icons = {
        INFO: <Info size={20} className="text-blue-500" />,
        SUCCESS: <CheckCircle size={20} className="text-emerald-500" />,
        WARNING: <AlertTriangle size={20} className="text-amber-500" />,
        ERROR: <XCircle size={20} className="text-red-500" />
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-start gap-3 min-w-[320px] max-w-md ring-1 ring-black/5">
                <div className="mt-0.5">{icons[notification.type]}</div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notification.message}</p>
                </div>
            </div>
        </div>
    );
};