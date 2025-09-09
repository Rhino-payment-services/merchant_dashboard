import React from 'react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-main-600 mb-4">Terms & Conditions</h1>
        <p className="text-gray-600 mb-6">Welcome to RukaPay! Please read these terms and conditions carefully before using our services.</p>
        <h2 className="text-xl font-semibold text-main-600 mt-6 mb-2">About RukaPay</h2>
        <p className="text-gray-700 mb-4">RukaPay is a modern fintech platform designed to help merchants and individuals receive payments, manage transactions, and grow their finances securely and efficiently. By using RukaPay, you agree to abide by the following terms and conditions.</p>
        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
          <li>All users must provide accurate and up-to-date information during registration and account management.</li>
          <li>Transactions processed through RukaPay are subject to verification and compliance checks.</li>
          <li>Users are responsible for maintaining the confidentiality of their account credentials.</li>
          <li>RukaPay reserves the right to update these terms at any time. Continued use of the platform constitutes acceptance of the new terms.</li>
          <li>For support or questions, please contact our help center.</li>
        </ul>
        <h2 className="text-xl font-semibold text-main-600 mt-6 mb-2">User Responsibilities</h2>
        <p className="text-gray-700 mb-4">By using RukaPay, you agree to use the platform for lawful purposes only and not to engage in any fraudulent or illegal activities. You are responsible for all activities that occur under your account.</p>
        <h2 className="text-xl font-semibold text-main-600 mt-6 mb-2">Privacy & Security</h2>
        <p className="text-gray-700 mb-4">RukaPay values your privacy and security. We implement industry-standard measures to protect your data and transactions. Please review our Privacy Policy for more details.</p>
        <div className="mt-8 text-gray-400 text-xs text-center">&copy; {new Date().getFullYear()} RukaPay. All rights reserved.</div>
      </div>
    </div>
  );
} 