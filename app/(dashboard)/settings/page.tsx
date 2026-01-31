"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";
import { User, Mail, Phone, Lock, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const userData = (session?.user as any)?.userData || (session?.user as any);
  const hasPassword = (session?.user as any)?.hasPassword ?? false;

  const [profile, setProfile] = useState({
    email: "",
    firstName: "",
    lastName: "",
    middleName: "",
    address: "",
    city: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [password, setPassword] = useState({ new: "", confirm: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (userData) {
      const p = userData?.profile || {};
      setProfile({
        email: userData?.email || p?.email || "",
        firstName: p?.firstName || userData?.firstName || "",
        lastName: p?.lastName || userData?.lastName || "",
        middleName: p?.middleName || "",
        address: p?.address || "",
        city: p?.city || "",
      });
    }
  }, [userData]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setProfileSaved(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await apiClient.patch("/auth/merchant/profile", {
        email: profile.email || undefined,
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        middleName: profile.middleName || undefined,
        address: profile.address || undefined,
        city: profile.city || undefined,
      });
      if (res.data?.success) {
        setProfileSaved(true);
        toast.success("Profile updated successfully");
        const updatedUser = res.data.user;
        if (updatedUser) {
          await update({
            user: {
              ...(session?.user as object),
              userData: { ...(userData || {}), ...updatedUser },
            },
          });
        }
      } else {
        toast.error(res.data?.message || "Failed to update profile");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as "new" | "confirm" | "current";
    if (name === "current") setCurrentPassword(e.target.value);
    else setPassword({ ...password, [name]: e.target.value });
    setPasswordSaved(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password.new !== password.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      if (hasPassword) {
        const res = await apiClient.post("/auth/change-password", {
          currentPassword,
          newPassword: password.new,
          confirmPassword: password.confirm,
        });
        if (res.data?.success) {
          setPasswordSaved(true);
          setCurrentPassword("");
          setPassword({ new: "", confirm: "" });
          toast.success("Password changed successfully");
        } else {
          toast.error(res.data?.message || "Failed to change password");
        }
      } else {
        const res = await apiClient.post("/auth/set-password", {
          password: password.new,
        });
        if (res.data?.success) {
          setPasswordSaved(true);
          setPassword({ new: "", confirm: "" });
          toast.success("Password set successfully. You can now log in with your email.");
          await update({ hasPassword: true });
        } else {
          toast.error(res.data?.message || "Failed to set password");
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const phoneDisplay = userData?.phone || (session?.user as any)?.phone || "—";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#08163d] mb-2">Account Settings</h1>
          <p className="text-gray-600">
            Update your profile and set a password to use email login
          </p>
        </div>

        <Card className="p-8 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-main-600" />
            Profile Information
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Fill out your profile and add your email. Once you set a password below, you can also log in with your email.
          </p>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Phone Number</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-100 text-gray-700">
                <Phone className="w-4 h-4 text-gray-500" />
                {phoneDisplay}
              </div>
              <p className="text-xs text-gray-500 mt-1">Phone number cannot be changed here</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  placeholder="your.email@example.com"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Add email to enable email + password login</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">First Name</label>
                <Input
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Last Name</label>
                <Input
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Middle Name (optional)</label>
              <Input
                name="middleName"
                value={profile.middleName}
                onChange={handleProfileChange}
                placeholder="Middle name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Address</label>
                <Input
                  name="address"
                  value={profile.address}
                  onChange={handleProfileChange}
                  placeholder="Address"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">City</label>
                <Input
                  name="city"
                  value={profile.city}
                  onChange={handleProfileChange}
                  placeholder="City"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={profileLoading}>
                {profileLoading ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-8 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-main-600" />
            {hasPassword ? "Change Password" : "Set Password for Email Login"}
          </h3>
          {!hasPassword && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Enable email login</p>
                <p>Add your email above and set a password here. You&apos;ll then be able to sign in with email and password in addition to phone + OTP.</p>
              </div>
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {hasPassword && (
              <div>
                <label className="block text-xs font-medium mb-1">Current Password</label>
                <Input
                  type="password"
                  name="current"
                  value={currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Current password"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1">
                {hasPassword ? "New Password" : "Password"}
              </label>
              <Input
                type="password"
                name="new"
                value={password.new}
                onChange={handlePasswordChange}
                placeholder={hasPassword ? "New password" : "Create password"}
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Confirm Password</label>
              <Input
                type="password"
                name="confirm"
                value={password.confirm}
                onChange={handlePasswordChange}
                placeholder="Confirm password"
                required
                minLength={8}
              />
              {password.confirm && password.new !== password.confirm && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <Button
                type="submit"
                disabled={
                  passwordLoading ||
                  !password.new ||
                  password.new !== password.confirm ||
                  password.new.length < 8 ||
                  (hasPassword && !currentPassword)
                }
              >
                {passwordLoading
                  ? "Updating..."
                  : hasPassword
                  ? "Change Password"
                  : "Set Password"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
