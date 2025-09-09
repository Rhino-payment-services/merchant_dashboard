import React from 'react';

const mockNotifications = [
  { id: 1, title: 'Payment Received', description: 'You received 500 USD from John Doe.', time: '2 min ago' },
  { id: 2, title: 'Withdrawal Successful', description: 'Your withdrawal of 200 USD was successful.', time: '1 hour ago' },
  { id: 3, title: 'New Message', description: 'Support replied to your ticket.', time: 'Yesterday' },
];

export default function NotificationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-main-600 mb-6">Notifications</h1>
        <div className="space-y-4">
          {mockNotifications.length === 0 ? (
            <div className="text-gray-400 text-center py-20">No notifications</div>
          ) : (
            mockNotifications.map((notif) => (
              <div key={notif.id} className="bg-white rounded-xl shadow-sm border border-main-50 p-5 flex flex-col gap-1 hover:shadow-md transition-shadow">
                <div className="font-semibold text-main-600">{notif.title}</div>
                <div className="text-gray-600 text-sm">{notif.description}</div>
                <div className="text-xs text-gray-400 mt-1">{notif.time}</div>
              </div>
              
            ))
          )}
        </div>
      </div>
    </div>
  );
} 