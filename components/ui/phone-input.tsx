"use client"

import React from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultCountry?: string;
}

export function PhoneNumberInput({
  value,
  onChange,
  placeholder = "700 123 456",
  disabled = false,
  className = "",
  defaultCountry = "ug"
}: PhoneInputProps) {
  return (
    <div className="w-full">
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
        containerStyle={{
          width: '100%',
        }}
      inputStyle={{
        width: '100%',
        height: '44px',
        fontSize: '14px',
        paddingLeft: '40px',
        paddingRight: '16px',
        borderRadius: '0.375rem',
        border: '1px solid #e5e7eb',
        backgroundColor: 'white',
      }}
      buttonStyle={{
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
    </div>
  );
}
