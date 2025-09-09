import React from 'react';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-8 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-main-50 flex items-center justify-center mb-4 border-4 border-main-100">
          <span className="text-4xl text-main-600 font-bold">NA</span>
        </div>
        <h1 className="text-2xl font-bold text-main-600 mb-1">Nathan Ake</h1>
        <div className="text-gray-500 mb-6">Merchant</div>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">nathan.ake@email.com</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">+1234567890</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Business Name</label>
            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">Ake Supermarket</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Business Type</label>
            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">Retail</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">123 Main Street, City, Country</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Registration Date</label>
            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">2023-01-15</div>
          </div>
        </div>
        <div className="w-full mt-4">
          <h2 className="text-lg font-semibold text-main-600 mb-2">Update Profile</h2>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Full Name" className="px-4 py-2 border rounded-lg w-full" />
              <input type="email" placeholder="Email" className="px-4 py-2 border rounded-lg w-full" />
              <input type="tel" placeholder="Phone" className="px-4 py-2 border rounded-lg w-full" />
              <input type="text" placeholder="Business Name" className="px-4 py-2 border rounded-lg w-full" />
            </div>
            <input type="text" placeholder="Address" className="px-4 py-2 border rounded-lg w-full" />
            <button type="submit" className="w-full py-2 rounded-lg bg-main-600 text-white font-semibold hover:bg-main-700 transition-colors text-base">Save Changes</button>
          </form>
        </div>
      </div>
    </div>
  );
} 