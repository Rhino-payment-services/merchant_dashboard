"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";
import {
  User,
  Mail,
  Phone,
  Lock,
  AlertCircle,
  KeyRound,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { UGANDAN_BANKS } from "@/app/lib/bankList";
import { useUserProfile } from "../UserProfileProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BankCombobox } from "@/components/ui/bank-combobox";
import { ConfirmLiquidationDestinationModal } from "./ConfirmLiquidationDestinationModal";

type LiquidationDestinationType = "MOBILE_MONEY" | "BANK";

type LiquidationDestinationSummary = {
  type: LiquidationDestinationType | null;
  momoProvider: string | null;
  momoPhone: string | null;
  momoPhoneMasked: string | null;
  momoAccountName: string | null;
  bankName: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankAccountNumberMasked: string | null;
  bankAccountName: string | null;
  bankBranch: string | null;
};

type LiquidationDestinationResponse = {
  canEdit: boolean;
  liquidationOnlyMode: boolean;
  liquidationDestinationType: LiquidationDestinationType | null;
  liquidationDestination?: LiquidationDestinationSummary | null;
  liquidationMomoProvider?: string | null;
  liquidationMomoPhone?: string | null;
  liquidationMomoAccountName?: string | null;
  liquidationBankName?: string | null;
  liquidationBankCode?: string | null;
  liquidationBankAccountNumber?: string | null;
  liquidationBankAccountName?: string | null;
  liquidationBankBranch?: string | null;
};

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { refetch: refetchProfile } = useUserProfile();
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

  const [liquidationLoading, setLiquidationLoading] = useState(true);
  const [liquidationSaving, setLiquidationSaving] = useState(false);
  const [canEditLiquidation, setCanEditLiquidation] = useState(true);
  const [liquidationDestination, setLiquidationDestination] =
    useState<LiquidationDestinationSummary | null>(null);
  const [liquidationDestinationType, setLiquidationDestinationType] =
    useState<LiquidationDestinationType>("MOBILE_MONEY");
  const [liquidationMomoProvider, setLiquidationMomoProvider] = useState("MTN");
  const [liquidationMomoPhone, setLiquidationMomoPhone] = useState("");
  const [liquidationMomoAccountName, setLiquidationMomoAccountName] =
    useState("");
  const [liquidationBankName, setLiquidationBankName] = useState("");
  const [liquidationBankCode, setLiquidationBankCode] = useState("");
  const [liquidationBankAccountNumber, setLiquidationBankAccountNumber] =
    useState("");
  const [liquidationBankAccountName, setLiquidationBankAccountName] =
    useState("");
  const [liquidationBankBranch, setLiquidationBankBranch] = useState("");
  const [confirmLiquidationOpen, setConfirmLiquidationOpen] = useState(false);

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

  const applyLiquidationSettings = (data: LiquidationDestinationResponse) => {
    setCanEditLiquidation(data.canEdit !== false);
    setLiquidationDestination(data.liquidationDestination || null);
    const type =
      data.liquidationDestinationType === "BANK" ||
      data.liquidationDestinationType === "MOBILE_MONEY"
        ? data.liquidationDestinationType
        : "MOBILE_MONEY";
    setLiquidationDestinationType(type);
    setLiquidationMomoProvider(data.liquidationMomoProvider || "MTN");
    setLiquidationMomoPhone(data.liquidationMomoPhone || "");
    setLiquidationMomoAccountName(data.liquidationMomoAccountName || "");
    setLiquidationBankName(data.liquidationBankName || "");
    setLiquidationBankCode(data.liquidationBankCode || "");
    setLiquidationBankAccountNumber(data.liquidationBankAccountNumber || "");
    setLiquidationBankAccountName(data.liquidationBankAccountName || "");
    setLiquidationBankBranch(data.liquidationBankBranch || "");
  };

  useEffect(() => {
    setLiquidationLoading(true);
    apiClient
      .get("/auth/merchant/liquidation-destination")
      .then((res) =>
        applyLiquidationSettings(res.data as LiquidationDestinationResponse),
      )
      .catch(() => toast.error("Failed to load liquidation destination"))
      .finally(() => setLiquidationLoading(false));
  }, []);

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

  const handleLiquidationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditLiquidation) return;

    if (liquidationDestinationType === "MOBILE_MONEY") {
      if (!liquidationMomoProvider.trim() || !liquidationMomoPhone.trim()) {
        toast.error("Mobile money provider and phone number are required");
        return;
      }
    } else {
      if (
        !liquidationBankCode.trim() ||
        !liquidationBankAccountNumber.trim() ||
        !liquidationBankAccountName.trim()
      ) {
        toast.error("Bank, account number, and account name are required");
        return;
      }
    }

    setConfirmLiquidationOpen(true);
  };

  const saveLiquidationDestination = async () => {
    if (!canEditLiquidation) return;

    const selectedBank = UGANDAN_BANKS.find(
      (b) => b.bankSortCode === liquidationBankCode,
    );

    setLiquidationSaving(true);
    try {
      const payload: Record<string, unknown> = {
        liquidationDestinationType,
      };
      if (liquidationDestinationType === "MOBILE_MONEY") {
        payload.liquidationMomoProvider = liquidationMomoProvider.trim();
        payload.liquidationMomoPhone = liquidationMomoPhone.trim();
        payload.liquidationMomoAccountName =
          liquidationMomoAccountName.trim() || null;
      } else {
        payload.liquidationBankName =
          selectedBank?.bankName ||
          liquidationBankName.trim() ||
          liquidationBankCode.trim();
        payload.liquidationBankCode = liquidationBankCode.trim();
        payload.liquidationBankAccountNumber =
          liquidationBankAccountNumber.trim();
        payload.liquidationBankAccountName = liquidationBankAccountName.trim();
        payload.liquidationBankBranch = liquidationBankBranch.trim() || null;
      }

      const res = await apiClient.post(
        "/auth/merchant/liquidation-destination",
        payload,
      );
      applyLiquidationSettings(res.data as LiquidationDestinationResponse);
      refetchProfile();
      setConfirmLiquidationOpen(false);
      toast.success(
        "Liquidation destination saved. It is now locked and only an admin can change it.",
      );
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to save liquidation destination",
      );
    } finally {
      setLiquidationSaving(false);
    }
  };

  const liquidationConfirmSummary =
    liquidationDestinationType === "MOBILE_MONEY"
      ? `${liquidationMomoProvider} · ${liquidationMomoPhone}`
      : `${
          UGANDAN_BANKS.find((b) => b.bankSortCode === liquidationBankCode)
            ?.bankName ||
          liquidationBankName ||
          "Bank"
        } · ${liquidationBankAccountNumber}`;

  const phoneDisplay = userData?.phone || (session?.user as any)?.phone || "—";
  const pinLoginEnabled = userData?.pinLoginEnabled === true;
  const portalPinSet = userData?.merchantPortalPinSet === true;

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
            <Landmark className="w-5 h-5 text-main-600" />
            Liquidation Destination
          </h3>
          {liquidationLoading ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : !canEditLiquidation ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-medium mb-2">Locked destination</p>
                {liquidationDestination?.type === "BANK" ? (
                  <div className="space-y-0.5">
                    <div>Bank: {liquidationDestination.bankName || "—"}</div>
                    <div>
                      Account:{" "}
                      {liquidationDestination.bankAccountNumberMasked ||
                        liquidationDestination.bankAccountNumber ||
                        "—"}
                    </div>
                    <div>
                      Name: {liquidationDestination.bankAccountName || "—"}
                    </div>
                    {liquidationDestination.bankBranch ? (
                      <div>Branch: {liquidationDestination.bankBranch}</div>
                    ) : null}
                  </div>
                ) : liquidationDestination?.type === "MOBILE_MONEY" ? (
                  <div className="space-y-0.5">
                    <div>
                      Provider: {liquidationDestination.momoProvider || "—"}
                    </div>
                    <div>
                      Phone:{" "}
                      {liquidationDestination.momoPhoneMasked ||
                        liquidationDestination.momoPhone ||
                        "—"}
                    </div>
                    {liquidationDestination.momoAccountName ? (
                      <div>Name: {liquidationDestination.momoAccountName}</div>
                    ) : null}
                  </div>
                ) : (
                  <p>No destination details available.</p>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Locked. Contact support or an administrator to change it.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLiquidationSubmit} className="space-y-4">
              <div className="mb-2 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Set only once</p>
                  <p>
                    You can set this only once. After saving, only an admin can
                    change it. Liquidations will be locked to this destination.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={
                    liquidationDestinationType === "MOBILE_MONEY"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setLiquidationDestinationType("MOBILE_MONEY")}
                >
                  Mobile Money
                </Button>
                <Button
                  type="button"
                  variant={
                    liquidationDestinationType === "BANK" ? "default" : "outline"
                  }
                  onClick={() => setLiquidationDestinationType("BANK")}
                >
                  Bank Account
                </Button>
              </div>

              {liquidationDestinationType === "MOBILE_MONEY" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Provider
                    </label>
                    <Select
                      value={liquidationMomoProvider}
                      onValueChange={setLiquidationMomoProvider}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">MTN</SelectItem>
                        <SelectItem value="AIRTEL">AIRTEL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Phone Number
                    </label>
                    <Input
                      value={liquidationMomoPhone}
                      onChange={(e) => setLiquidationMomoPhone(e.target.value)}
                      placeholder="2567XXXXXXXX"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Account Name (optional)
                    </label>
                    <Input
                      value={liquidationMomoAccountName}
                      onChange={(e) =>
                        setLiquidationMomoAccountName(e.target.value)
                      }
                      placeholder="Account name"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1">Bank</label>
                    <BankCombobox
                      value={liquidationBankCode}
                      onValueChange={(code, name) => {
                        setLiquidationBankCode(code);
                        setLiquidationBankName(name);
                      }}
                      placeholder="Choose bank"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Account Number
                    </label>
                    <Input
                      value={liquidationBankAccountNumber}
                      onChange={(e) =>
                        setLiquidationBankAccountNumber(e.target.value)
                      }
                      placeholder="Account number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Account Name
                    </label>
                    <Input
                      value={liquidationBankAccountName}
                      onChange={(e) =>
                        setLiquidationBankAccountName(e.target.value)
                      }
                      placeholder="Account name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Branch (optional)
                    </label>
                    <Input
                      value={liquidationBankBranch}
                      onChange={(e) => setLiquidationBankBranch(e.target.value)}
                      placeholder="Branch"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end mt-4">
                <Button type="submit" disabled={liquidationSaving}>
                  Save Liquidation Destination
                </Button>
              </div>
            </form>
          )}
        </Card>

        <ConfirmLiquidationDestinationModal
          open={confirmLiquidationOpen}
          loading={liquidationSaving}
          summary={liquidationConfirmSummary}
          onOpenChange={setConfirmLiquidationOpen}
          onConfirm={saveLiquidationDestination}
        />

        {pinLoginEnabled && (
          <Card className="p-8 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-main-600" />
              Merchant Portal PIN
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-700">
                {portalPinSet
                  ? "Your portal PIN is set. Use the button below to change it."
                  : "No portal PIN set yet. Create one to use PIN sign-in."}
              </p>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/auth/setup-portal-pin">
                  {portalPinSet ? "Change portal PIN" : "Set up portal PIN"}
                </Link>
              </Button>
            </div>
          </Card>
        )}

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
