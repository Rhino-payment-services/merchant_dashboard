"use client";
import React, { useState } from "react";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" });
  const [notifications, setNotifications] = useState({ email: true, sms: false });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword({ ...password, [e.target.name]: e.target.value });
  };
  const handleNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotifications({ ...notifications, [e.target.name]: e.target.checked });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#08163d] mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        <Card className="p-8 mb-8">
          <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <Input name="name" value={profile.name} onChange={handleProfileChange} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <Input name="email" value={profile.email} onChange={handleProfileChange} placeholder="Your email" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button>Save Profile</Button>
          </div>
        </Card>
        <Card className="p-8 mb-8">
          <h3 className="text-lg font-semibold mb-4">Change Password</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Current Password</label>
              <Input type="password" name="current" value={password.current} onChange={handlePasswordChange} placeholder="Current password" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">New Password</label>
              <Input type="password" name="new" value={password.new} onChange={handlePasswordChange} placeholder="New password" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Confirm Password</label>
              <Input type="password" name="confirm" value={password.confirm} onChange={handlePasswordChange} placeholder="Confirm new password" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button>Change Password</Button>
          </div>
        </Card>
        <Card className="p-8">
          <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="email" checked={notifications.email} onChange={handleNotificationsChange} />
              Email Notifications
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="sms" checked={notifications.sms} onChange={handleNotificationsChange} />
              SMS Notifications
            </label>
          </div>
          <div className="flex justify-end mt-4">
            <Button>Save Preferences</Button>
          </div>
        </Card>
      </div>
    </div>
  );
} 