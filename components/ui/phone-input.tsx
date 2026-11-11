"use client"

import React from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultCountry?: string;
  /** "auth" swaps the inline styles for the `.auth-phone` classes in globals.css. */
  variant?: 'default' | 'auth';
  invalid?: boolean;
  inputId?: string;
  describedBy?: string;
  /** Auth variant only: rendered as a floated label in the top border. */
  label?: string;
}

export function PhoneNumberInput({
  value,
  onChange,
  placeholder = "700 123 456",
  disabled = false,
  className = "",
  defaultCountry = "ug",
  variant = 'default',
  invalid = false,
  inputId,
  describedBy,
  label,
}: PhoneInputProps) {
  const isAuth = variant === 'auth';
  const showFloatingLabel = isAuth && !!label;

  return (
    <div className={cn("w-full", showFloatingLabel && "group relative", className)}>
      <PhoneInput
        country={defaultCountry}
        value={value}
        onChange={(phone) => {
          // Ensure we send without + prefix
          const cleanPhone = phone.replace(/^\+/, '');
          onChange(cleanPhone);
        }}
        placeholder={placeholder}
        disabled={disabled}
        onlyCountries={['ug']}
        disableDropdown={true}
        countryCodeEditable={false}
        inputProps={{
          id: inputId,
          'aria-invalid': invalid || undefined,
          'aria-describedby': describedBy,
        }}
        containerClass={isAuth ? cn('auth-phone', invalid && 'auth-phone--invalid') : undefined}
        containerStyle={{
          width: '100%',
        }}
        inputStyle={isAuth ? undefined : {
          width: '100%',
          height: '44px',
          fontSize: '14px',
          paddingLeft: '40px',
          paddingRight: '16px',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
          backgroundColor: 'white',
        }}
        buttonStyle={isAuth ? undefined : {
          height: '44px',
          border: '1px solid #e5e7eb',
          borderRight: 'none',
          borderRadius: '0.375rem 0 0 0.375rem',
          backgroundColor: '#f9fafb',
          padding: '0 0.5px',
          minWidth: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      />
      {showFloatingLabel && (
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-2.5 top-0 z-[1] -translate-y-1/2 rounded-sm bg-[color:var(--field-bg,#fff)] px-1 text-xs text-slate-500 transition-colors duration-200 group-focus-within:text-primary",
            invalid && "text-error group-focus-within:text-error",
            disabled && "text-slate-400"
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
}
