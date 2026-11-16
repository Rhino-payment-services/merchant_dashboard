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
  Bell,
} from "lucide-react";
import Link from "next/link";
import { UGANDAN_BANKS } from "@/app/lib/bankList";
import { useUserProfile } from "../UserProfileProvider";
import { AccessDenied } from "@/app/components/AccessDenied";
import { useTeamPermissionSession } from "@/lib/hooks/useTeamPermissionSession";
import { canManageSettings } from "@/lib/utils/permissions";
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
  const teamSession = useTeamPermissionSession();
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

  const [paymentNotifLoading, setPaymentNotifLoading] = useState(true);
  const [paymentNotifSaving, setPaymentNotifSaving] = useState(false);
  const [paymentSmsEnabled, setPaymentSmsEnabled] = useState(true);
  const [paymentEmailEnabled, setPaymentEmailEnabled] = useState(false);
  const [paymentOwnerPhone, setPaymentOwnerPhone] = useState<string | null>(
    null,
  );
  const [paymentOwnerEmail, setPaymentOwnerEmail] = useState<string | null>(
    null,
  );

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

  useEffect(() => {
    let cancelled = false;
    const loadPaymentNotificationSettings = async () => {
      try {
        setPaymentNotifLoading(true);
        const res = await apiClient.get(
          "/auth/merchant/payment-notification-settings",
        );
        if (cancelled) return;
        const data = res.data || {};
        setPaymentSmsEnabled(data.merchantPaymentSmsEnabled !== false);
        setPaymentEmailEnabled(data.merchantPaymentEmailEnabled === true);
        setPaymentOwnerPhone(data.ownerPhone || null);
        setPaymentOwnerEmail(data.ownerEmail || null);
      } catch (err: any) {
        if (!cancelled) {
          console.error("Failed to load payment notification settings", err);
        }
      } finally {
        if (!cancelled) setPaymentNotifLoading(false);
      }
    };
    loadPaymentNotificationSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePaymentNotificationSettings = async (next: {
    merchantPaymentSmsEnabled?: boolean;
    merchantPaymentEmailEnabled?: boolean;
  }) => {
    const previousSms = paymentSmsEnabled;
    const previousEmail = paymentEmailEnabled;
    try {
      setPaymentNotifSaving(true);
      if (next.merchantPaymentSmsEnabled !== undefined) {
        setPaymentSmsEnabled(next.merchantPaymentSmsEnabled);
      }
      if (next.merchantPaymentEmailEnabled !== undefined) {
        setPaymentEmailEnabled(next.merchantPaymentEmailEnabled);
      }
      const res = await apiClient.patch(
        "/auth/merchant/payment-notification-settings",
        next,
      );
      const data = res.data || {};
      if (data.merchantPaymentSmsEnabled !== undefined) {
        setPaymentSmsEnabled(data.merchantPaymentSmsEnabled !== false);
      }
      if (data.merchantPaymentEmailEnabled !== undefined) {
        setPaymentEmailEnabled(data.merchantPaymentEmailEnabled === true);
      }
      toast.success("Payment confirmation settings saved");
    } catch (err: any) {
      setPaymentSmsEnabled(previousSms);
      setPaymentEmailEnabled(previousEmail);
      toast.error(
        err.response?.data?.message ||
          "Failed to update payment confirmation settings",
      );
    } finally {
      setPaymentNotifSaving(false);
    }
  };

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

  if (!canManageSettings(teamSession)) {
    return (
      <AccessDenied description="You do not have permission to manage settings." />
    );
  }

  const fieldLabel = "mb-1.5 block text-[12px] font-medium text-gray-600";
  const fieldInput = "h-10";
  const sectionCard =
    "rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
  const typeBtn = (active: boolean) =>
    `inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
      active
        ? "border-gray-900 bg-gray-900 text-white"
        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
    }`;

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Account Settings</h1>
          <p className="mt-0.5 text-[12px] text-gray-400">
            Update your profile and set a password to use email login
          </p>
        </div>

        <Card className={sectionCard}>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            <User className="h-4 w-4 text-gray-400" />
            Profile Information
          </h3>
          <p className="mt-1 mb-4 text-[12px] text-gray-400">
            Fill out your profile and add your email. Once you set a password below, you can also log in with your email.
          </p>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className={fieldLabel}>Phone Number</label>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 text-[13px] text-gray-700">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                {phoneDisplay}
              </div>
              <p className="mt-1 text-[11px] text-gray-400">Phone number cannot be changed here</p>
            </div>
            <div>
              <label className={fieldLabel}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  placeholder="your.email@example.com"
                  className={`${fieldInput} pl-10`}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">Add email to enable email + password login</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={fieldLabel}>First Name</label>
                <Input
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                  placeholder="First name"
                  className={fieldInput}
                />
              </div>
              <div>
                <label className={fieldLabel}>Last Name</label>
                <Input
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                  placeholder="Last name"
                  className={fieldInput}
                />
              </div>
            </div>
            <div>
              <label className={fieldLabel}>Middle Name (optional)</label>
              <Input
                name="middleName"
                value={profile.middleName}
                onChange={handleProfileChange}
                placeholder="Middle name"
                className={fieldInput}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={fieldLabel}>Address</label>
                <Input
                  name="address"
                  value={profile.address}
                  onChange={handleProfileChange}
                  placeholder="Address"
                  className={fieldInput}
                />
              </div>
              <div>
                <label className={fieldLabel}>City</label>
                <Input
                  name="city"
                  value={profile.city}
                  onChange={handleProfileChange}
                  placeholder="City"
                  className={fieldInput}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={profileLoading}
                className="h-8 rounded-full bg-gray-900 px-4 text-[12px] hover:bg-gray-800"
              >
                {profileLoading ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className={sectionCard}>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            <Landmark className="h-4 w-4 text-gray-400" />
            Liquidation Destination
          </h3>
          {liquidationLoading ? (
            <p className="mt-3 text-[12px] text-gray-400">Loading...</p>
          ) : !canEditLiquidation ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-[12px] text-gray-700">
                <p className="mb-2 font-semibold text-gray-900">Locked destination</p>
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
              <p className="text-[12px] text-gray-400">
                Locked. Contact support or an administrator to change it.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLiquidationSubmit} className="mt-3 space-y-4">
              <div className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="text-[12px] text-amber-800">
                  <p className="mb-0.5 font-medium">Set only once</p>
                  <p>
                    You can set this only once. After saving, only an admin can
                    change it. Liquidations will be locked to this destination.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={typeBtn(liquidationDestinationType === "MOBILE_MONEY")}
                  onClick={() => setLiquidationDestinationType("MOBILE_MONEY")}
                >
                  Mobile Money
                </button>
                <button
                  type="button"
                  className={typeBtn(liquidationDestinationType === "BANK")}
                  onClick={() => setLiquidationDestinationType("BANK")}
                >
                  Bank Account
                </button>
              </div>

              {liquidationDestinationType === "MOBILE_MONEY" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={fieldLabel}>Provider</label>
                    <Select
                      value={liquidationMomoProvider}
                      onValueChange={setLiquidationMomoProvider}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">MTN</SelectItem>
                        <SelectItem value="AIRTEL">AIRTEL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={fieldLabel}>Phone Number</label>
                    <Input
                      value={liquidationMomoPhone}
                      onChange={(e) => setLiquidationMomoPhone(e.target.value)}
                      placeholder="2567XXXXXXXX"
                      required
                      className={fieldInput}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={fieldLabel}>Account Name (optional)</label>
                    <Input
                      value={liquidationMomoAccountName}
                      onChange={(e) =>
                        setLiquidationMomoAccountName(e.target.value)
                      }
                      placeholder="Account name"
                      className={fieldInput}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={fieldLabel}>Bank</label>
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
                    <label className={fieldLabel}>Account Number</label>
                    <Input
                      value={liquidationBankAccountNumber}
                      onChange={(e) =>
                        setLiquidationBankAccountNumber(e.target.value)
                      }
                      placeholder="Account number"
                      required
                      className={fieldInput}
                    />
                  </div>
                  <div>
                    <label className={fieldLabel}>Account Name</label>
                    <Input
                      value={liquidationBankAccountName}
                      onChange={(e) =>
                        setLiquidationBankAccountName(e.target.value)
                      }
                      placeholder="Account name"
                      required
                      className={fieldInput}
                    />
                  </div>
                  <div>
                    <label className={fieldLabel}>Branch (optional)</label>
                    <Input
                      value={liquidationBankBranch}
                      onChange={(e) => setLiquidationBankBranch(e.target.value)}
                      placeholder="Branch"
                      className={fieldInput}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={liquidationSaving}
                  className="h-8 rounded-full bg-gray-900 px-4 text-[12px] hover:bg-gray-800"
                >
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
          <Card className={sectionCard}>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
              <KeyRound className="h-4 w-4 text-gray-400" />
              Merchant Portal PIN
            </h3>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-gray-500">
                {portalPinSet
                  ? "Your portal PIN is set. Use the button below to change it."
                  : "No portal PIN set yet. Create one to use PIN sign-in."}
              </p>
              <Button asChild variant="outline" className="h-8 shrink-0 rounded-full border-gray-200 px-3 text-[12px]">
                <Link href="/auth/setup-portal-pin">
                  {portalPinSet ? "Change portal PIN" : "Set up portal PIN"}
                </Link>
              </Button>
            </div>
          </Card>
        )}

        <Card className={sectionCard}>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            <Bell className="h-4 w-4 text-gray-400" />
            Payment Confirmation
          </h3>
          <p className="mt-1 mb-4 text-[12px] text-gray-400">
            Choose how the merchant owner is notified when a customer payment is
            received. Team members manage their own toggles on the Team page.
          </p>
          {paymentNotifLoading ? (
            <p className="text-[12px] text-gray-400">Loading notification settings...</p>
          ) : (
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-100 px-3.5 py-3">
                <div>
                  <div className="text-[13px] font-medium text-gray-900">SMS notifications</div>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Send payment confirmation SMS to{" "}
                    {paymentOwnerPhone || "the owner phone"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={paymentSmsEnabled}
                  disabled={paymentNotifSaving || !paymentOwnerPhone}
                  onChange={(e) => {
                    void savePaymentNotificationSettings({
                      merchantPaymentSmsEnabled: e.target.checked,
                    });
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-100 px-3.5 py-3">
                <div>
                  <div className="text-[13px] font-medium text-gray-900">Email notifications</div>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Send payment confirmation email to{" "}
                    {paymentOwnerEmail || "the owner email"}
                    {!paymentOwnerEmail
                      ? " — add an email above before enabling"
                      : ""}
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={paymentEmailEnabled}
                  disabled={paymentNotifSaving || !paymentOwnerEmail}
                  onChange={(e) => {
                    void savePaymentNotificationSettings({
                      merchantPaymentEmailEnabled: e.target.checked,
                    });
                  }}
                />
              </label>
            </div>
          )}
        </Card>

        <Card className={sectionCard}>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            <Lock className="h-4 w-4 text-gray-400" />
            {hasPassword ? "Change Password" : "Set Password for Email Login"}
          </h3>
          {!hasPassword && (
            <div className="mt-3 mb-4 flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-[12px] text-amber-800">
                <p className="mb-0.5 font-medium">Enable email login</p>
                <p>Add your email above and set a password here. You&apos;ll then be able to sign in with email and password in addition to phone + OTP.</p>
              </div>
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className={`${hasPassword ? "mt-4" : ""} space-y-4`}>
            {hasPassword && (
              <div>
                <label className={fieldLabel}>Current Password</label>
                <Input
                  type="password"
                  name="current"
                  value={currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Current password"
                  required
                  className={fieldInput}
                />
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={fieldLabel}>
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
                  className={fieldInput}
                />
                <p className="mt-1 text-[11px] text-gray-400">At least 8 characters</p>
              </div>
              <div>
                <label className={fieldLabel}>Confirm Password</label>
                <Input
                  type="password"
                  name="confirm"
                  value={password.confirm}
                  onChange={handlePasswordChange}
                  placeholder="Confirm password"
                  required
                  minLength={8}
                  className={fieldInput}
                />
                {password.confirm && password.new !== password.confirm && (
                  <p className="mt-1 text-[11px] text-red-600">Passwords do not match</p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  passwordLoading ||
                  !password.new ||
                  password.new !== password.confirm ||
                  password.new.length < 8 ||
                  (hasPassword && !currentPassword)
                }
                className="h-8 rounded-full bg-gray-900 px-4 text-[12px] hover:bg-gray-800"
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
