"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Mail,
  LogOut,
  ShieldCheck,
  AtSign,
  Wallet,
  RotateCw,
  Fingerprint,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Trash2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  // Theme & Page States
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const adminPhone = "2347081671426";

  // Biometric States
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // User Profile State
  const [userData, setUserData] = useState({
    full_name: "Loading...",
    username: "...",
    phone: "...",
    balance: "...",
    level: "Member",
    joined: "...",
    email: "",
  });

  // Modal Control States
  const [activeModal, setActiveModal] = useState<"password" | "pin" | "delete" | null>(null);
  const [modalStage, setModalStage] = useState<"request" | "verify">("request");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Field States
  const [formEmail, setFormEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");

  // Feedback States
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const syncDataFromStorage = useCallback(() => {
    const raw = localStorage.getItem("user_session");
    if (raw) {
      const session = JSON.parse(raw);
      const data = session.user_data || {};
      setUserData({
        full_name: data.full_name || "User",
        username: data.full_name?.toLowerCase().replace(/\s+/g, "_") || "user_unknown",
        phone: data.phone || "No phone linked",
        balance: data.balance || "0.00",
        level: data.level || "Member",
        joined: data.created_at || "Member",
        email: data.email || "",
      });
      if (data.email) {
        setFormEmail(data.email);
      }
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const raw = localStorage.getItem("user_session");
      if (!raw) return;
      const session = JSON.parse(raw);
      const phone = session.user_data?.phone || localStorage.getItem("phone");

      if (!phone) throw new Error("No phone found for refresh");

      const response = await fetch(
        "https://obills.com.ng/app/api/user/app-refresh/index.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}

        const user = result.user_data;
        if (user) {
          localStorage.setItem("balance", user.balance);
          localStorage.setItem("cashback", user.cashback);
          localStorage.setItem("full_name", user.full_name);
          localStorage.setItem("level", user.level);
          if (result.token) localStorage.setItem("token", result.token);

          const updatedSession = {
            ...session,
            token: result.token || session.token,
            user_data: {
              ...session.user_data,
              ...user,
            },
          };
          localStorage.setItem("user_session", JSON.stringify(updatedSession));
        }

        syncDataFromStorage();
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [syncDataFromStorage]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme");
    const dark = savedTheme !== "light";
    setIsDarkMode(dark);

    syncDataFromStorage();

    // Native WebAuthn availability check
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          setIsBiometricAvailable(available);
          if (available) {
            const isEnrolled = localStorage.getItem("biometrics_enabled") === "true";
            setBiometricsEnabled(isEnrolled);
          }
        })
        .catch(console.error);
    } else {
      setIsBiometricAvailable(false);
    }

    setLoading(false);
  }, [syncDataFromStorage]);

  const handleToggleBiometrics = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}

    if (biometricsEnabled) {
      localStorage.setItem("biometrics_enabled", "false");
      localStorage.removeItem("bio_phone");
      localStorage.removeItem("bio_pass");
      setBiometricsEnabled(false);
    } else {
      const raw = localStorage.getItem("user_session");
      if (!raw) return;

      if (!window.PublicKeyCredential) {
        alert("Biometrics not supported on this device/browser.");
        return;
      }

      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const userID = new Uint8Array(16);
        window.crypto.getRandomValues(userID);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: challenge,
            rp: { name: "Obills" },
            user: {
              id: userID,
              name: userData.phone || "user",
              displayName: userData.full_name || "User",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 },
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
              residentKey: "discouraged",
              requireResidentKey: false,
            },
            timeout: 60000,
          },
        });

        if (credential) {
          const credIdString =
            typeof credential.id === "string"
              ? credential.id
              : window.btoa(String.fromCharCode(...new Uint8Array(credential.id)));
          localStorage.setItem("bio_credentials", credIdString);

          const response = await fetch(
            "https://obills.com.ng/app/api/user/register-biometric/index.php",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phone: userData.phone,
                credential_id: credential.id,
              }),
            }
          );

          const result = await response.json();

          if (result.status === "success") {
            localStorage.setItem("biometrics_enabled", "true");
            localStorage.setItem("bio_phone", userData.phone);
            setBiometricsEnabled(true);

            try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) {}
            alert("Biometric authentication successfully enabled!");
          } else {
            try { await Haptics.notification({ type: NotificationType.Error }); } catch (e) {}
            alert(result.msg || "Biometrics scanned, but failed to save to database.");
          }
        }
      } catch (err) {
        console.error("Biometric enrollment error:", err);
        try { await Haptics.notification({ type: NotificationType.Error }); } catch (e) {}
        alert(
          "Could not register biometrics. Please ensure fingerprint or Face ID is set up on your device."
        );
      }
    }
  };

  const handleLogout = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) {}
    localStorage.removeItem("user_session");
    localStorage.removeItem("balance");
    localStorage.removeItem("token");
    localStorage.removeItem("userToken");
    localStorage.removeItem("cashback");
    localStorage.removeItem("full_name");
    localStorage.removeItem("app_theme");
    sessionStorage.clear();
    try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) {}
    router.push("/");
  };

  const resetFormState = () => {
    setModalStage("request");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setNewPin("");
    setFormError("");
    setFormSuccess("");
    setActionLoading(false);
  };

  const openSecurityModal = async (type: "password" | "pin" | "delete") => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}
    setActiveModal(type);
    resetFormState();
    if (userData.email) {
      setFormEmail(userData.email);
    }
  };

  const validatePasswordRequirements = (pass: string) => {
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isValidLength = pass.length >= 8;
    return { hasUpper, hasNumber, hasSpecial, isValidLength };
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formEmail) {
      setFormError("Please enter your registered email address.");
      return;
    }

    setActionLoading(true);
    const endpoint =
      activeModal === "password"
        ? "https://obills.com.ng/app/api/user/forgot-password/index.php"
        : "https://obills.com.ng/app/api/user/forgot-pin/index.php";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formEmail.trim(), action: "request" }),
      });

      const data = await response.json();

      if (data.status === "success") {
        try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) {}
        setFormSuccess("Verification code sent! Code valid for 1 minute.");
        setModalStage("verify");
      } else {
        try { await Haptics.notification({ type: NotificationType.Error }); } catch (e) {}
        setFormError(data.msg || "Failed to deliver OTP request.");
      }
    } catch (err) {
      setFormError("Network communication error. Please check your connection.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!otp || otp.trim().length !== 5) {
      setFormError("Please present a valid 5-digit verification code.");
      return;
    }

    const payload: any = {
      email: formEmail.trim(),
      otp: otp.trim(),
      action: "update",
    };

    if (activeModal === "password") {
      const validation = validatePasswordRequirements(newPassword);
      if (
        !validation.isValidLength ||
        !validation.hasUpper ||
        !validation.hasNumber ||
        !validation.hasSpecial
      ) {
        setFormError("Password security metrics not met.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError("Password confirmation verification failed.");
        return;
      }
      payload.new_password = newPassword;
    } else {
      if (!/^\d{5}$/.test(newPin)) {
        setFormError("Transaction PIN must be strictly 5 digits long.");
        return;
      }
      payload.new_pin = newPin;
    }

    setActionLoading(true);
    const endpoint =
      activeModal === "password"
        ? "https://obills.com.ng/app/api/user/forgot-password/index.php"
        : "https://obills.com.ng/app/api/user/forgot-pin/index.php";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === "success") {
        try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) {}
        setFormSuccess(data.msg || "Security criteria updated successfully.");
        setTimeout(() => {
          setActiveModal(null);
          resetFormState();
        }, 2000);
      } else {
        try { await Haptics.notification({ type: NotificationType.Error }); } catch (e) {}
        setFormError(data.msg || "Verification or processing error encountered.");
      }
    } catch (err) {
      setFormError("Security update transaction could not be finished.");
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp Redirect Handler for Account Deletion
  const handleConfirmDeleteAccount = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) {}
    
    const promptMessage = `i am ${userData.full_name}, a user with the Obills app, I want to delete my account`;
    const encodedMessage = encodeURIComponent(promptMessage);
    
    // Redirects to WhatsApp Admin page (Pre-fills text message)
    const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodedMessage}`;
    
    setActiveModal(null);
    window.location.href = whatsappUrl;
  };

  const ProfileItem = ({
    icon: Icon,
    label,
    value,
    highlight = false,
  }: {
    icon: any;
    label: string;
    value: string;
    highlight?: boolean;
  }) => (
    <div
      className={`p-5 rounded-[1.5rem] border transition-all flex items-center gap-4 ${
        isDarkMode
          ? "bg-[#1c1425] border-white/5 text-white"
          : "bg-white border-slate-200/60 shadow-sm text-slate-900"
      }`}
    >
      <div
        className={`h-11 w-11 rounded-xl flex items-center justify-center ${
          isDarkMode ? "bg-white/5 text-zinc-400" : "bg-slate-50 text-slate-400"
        } ${highlight ? "text-emerald-500" : ""}`}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">
          {label}
        </p>
        <p
          className={`text-sm font-black tracking-tight truncate ${
            highlight ? "text-emerald-500" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center ${
          isDarkMode ? "bg-[#0f0a14]" : "bg-slate-50"
        }`}
      >
        <div
          className={`animate-pulse font-black text-[10px] tracking-[0.3em] ${
            isDarkMode ? "text-white" : "text-slate-900"
          }`}
        >
          VERIFYING IDENTITY...
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full font-sans transition-colors duration-300 pb-12 ${
        isDarkMode ? "bg-[#0f0a14] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Header */}
      <header className="px-5 flex justify-between items-center py-8 max-w-md mx-auto">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="icon"
          className={`rounded-full h-10 w-10 ${
            isDarkMode
              ? "bg-white/5 hover:bg-white/10 text-white"
              : "bg-white shadow-sm border border-slate-200 text-slate-900"
          }`}
        >
          <ChevronLeft size={22} />
        </Button>
        <h2
          className={`text-[10px] font-black uppercase tracking-[0.4em] ${
            isDarkMode ? "text-zinc-500" : "text-slate-400"
          }`}
        >
          Identity Vault
        </h2>
        <div className="w-10" />
      </header>

      {/* Hero Section */}
      <div className="px-5 mb-8 text-center max-w-md mx-auto">
        <div className="relative inline-block mb-5">
          <div
            className={`h-24 w-24 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-2xl ${
              isDarkMode
                ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white"
                : "bg-slate-900 text-white"
            }`}
          >
            {userData.full_name ? userData.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-4 flex items-center justify-center ${
              isDarkMode
                ? "bg-emerald-500 border-[#0f0a14]"
                : "bg-emerald-500 border-slate-50"
            }`}
          >
            <ShieldCheck size={12} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tighter italic">
          {userData.full_name}
        </h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
              isDarkMode ? "text-zinc-500" : "text-slate-400"
            }`}
          >
            @{userData.username}
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-1 rounded-full transition-all active:scale-95 ${
              isRefreshing
                ? "animate-spin opacity-50"
                : "opacity-40 hover:opacity-100"
            }`}
          >
            <RotateCw size={12} />
          </button>
        </div>
      </div>

      {/* Information Grid */}
      <main className="px-5 space-y-3 max-w-md mx-auto">
        <ProfileItem
          icon={ShieldCheck}
          label="Account Status"
          value={userData.level}
          highlight={true}
        />
        <ProfileItem
          icon={AtSign}
          label="Username"
          value={`@${userData.username}`}
        />
        <ProfileItem icon={Mail} label="Contact" value={userData.phone} />
        <ProfileItem
          icon={Wallet}
          label="Balance"
          value={`₦${parseFloat(userData.balance || "0").toLocaleString()}`}
        />

        {/* Security & Settings Section */}
        <div
          className={`mt-6 p-6 rounded-[2rem] border transition-all ${
            isDarkMode
              ? "bg-[#1c1425] border-white/5"
              : "bg-white border-slate-200/60 shadow-sm"
          }`}
        >
          <h4
            className={`text-[9px] font-black uppercase tracking-widest mb-4 ${
              isDarkMode ? "text-zinc-500" : "text-slate-400"
            }`}
          >
            Security & Controls
          </h4>

          {/* Biometrics Toggle Component */}
          {isBiometricAvailable && (
            <div
              onClick={handleToggleBiometrics}
              className={`w-full h-14 rounded-2xl flex items-center justify-between px-3 hover:bg-white/5 cursor-pointer text-left transition-all font-black border border-transparent mb-2 ${
                isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    isDarkMode ? "bg-white/5" : "bg-slate-100"
                  } ${biometricsEnabled ? "text-emerald-500" : "text-zinc-400"}`}
                >
                  <Fingerprint size={18} />
                </div>
                <div>
                  <p className="text-xs font-black">Biometric Login</p>
                  <p className="text-[10px] opacity-40">
                    {biometricsEnabled ? "Hardware Verified" : "Tap to Enable"}
                  </p>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
                  biometricsEnabled ? "bg-emerald-500 justify-end" : "bg-zinc-700/40 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </div>
            </div>
          )}

          {/* Password Reset Trigger */}
          <button
            onClick={() => openSecurityModal("password")}
            className={`w-full h-14 rounded-2xl flex items-center justify-between px-3 cursor-pointer text-left transition-all font-black mb-2 ${
              isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  isDarkMode ? "bg-white/5 text-zinc-400" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Lock size={18} />
              </div>
              <div>
                <p className="text-xs font-black">Account Password</p>
                <p className="text-[10px] opacity-40">Change or Reset</p>
              </div>
            </div>
          </button>

          {/* PIN Reset Trigger */}
          <button
            onClick={() => openSecurityModal("pin")}
            className={`w-full h-14 rounded-2xl flex items-center justify-between px-3 cursor-pointer text-left transition-all font-black mb-2 ${
              isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  isDarkMode ? "bg-white/5 text-zinc-400" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Key size={18} />
              </div>
              <div>
                <p className="text-xs font-black">Transaction PIN</p>
                <p className="text-[10px] opacity-40">Modify 5-Digit Authorization Code</p>
              </div>
            </div>
          </button>

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className={`w-full h-14 rounded-2xl flex items-center justify-between px-3 cursor-pointer text-left transition-all font-black ${
              isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
                <LogOut size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-amber-500">Sign Out</p>
                <p className="text-[10px] opacity-40">Clear Active Vault Session</p>
              </div>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div
          className={`p-6 rounded-[2rem] border transition-all ${
            isDarkMode
              ? "bg-[#1f1017]/50 border-rose-500/10"
              : "bg-rose-50/50 border-rose-200/60"
          }`}
        >
          <h4 className="text-[9px] font-black uppercase tracking-widest mb-3 text-rose-500/80">
            Danger Zone
          </h4>

          <button
            onClick={() => openSecurityModal("delete")}
            className="w-full h-14 rounded-2xl flex items-center justify-between px-3 cursor-pointer text-left transition-all font-black hover:bg-rose-500/10"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500">
                <Trash2 size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-rose-500">Delete Your Account</p>
                <p className="text-[10px] text-rose-500/60">Permanently Remove Account Data</p>
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* ======================= MODAL SYSTEM ======================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Effect */}
          <div
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl transition-opacity animate-in fade-in duration-200"
          />

          {/* Modal Container */}
          <div
            className={`relative w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border transition-all z-10 animate-in zoom-in-95 duration-200 ${
              isDarkMode
                ? "bg-[#181120] border-white/10 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveModal(null)}
              className={`absolute top-5 right-5 h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              <X size={16} />
            </button>

            {/* PASSWORD / PIN MODAL FORM */}
            {(activeModal === "password" || activeModal === "pin") && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    {activeModal === "password" ? <Lock size={18} /> : <Key size={18} />}
                  </div>
                  <div>
                    <h3 className="text-base font-black">
                      {activeModal === "password" ? "Update Password" : "Reset Transaction PIN"}
                    </h3>
                    <p className="text-[10px] opacity-40">
                      {modalStage === "request" ? "Request Verification Code" : "Enter Verification OTP"}
                    </p>
                  </div>
                </div>

                {formError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                    {formSuccess}
                  </div>
                )}

                {modalStage === "request" ? (
                  <form onSubmit={handleRequestOTP} className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider opacity-50 mb-1 block">
                        Registered Email
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className={`w-full h-12 px-4 rounded-xl border text-xs font-bold outline-none transition-all ${
                          isDarkMode
                            ? "bg-white/5 border-white/10 focus:border-emerald-500"
                            : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                        }`}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all"
                    >
                      {actionLoading ? "Requesting OTP..." : "Send Verification Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleUpdateSecurity} className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider opacity-50 mb-1 block">
                        5-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="12345"
                        className={`w-full h-12 px-4 rounded-xl border text-center text-sm tracking-[0.5em] font-black outline-none transition-all ${
                          isDarkMode
                            ? "bg-white/5 border-white/10 focus:border-emerald-500"
                            : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                        }`}
                        required
                      />
                    </div>

                    {activeModal === "password" ? (
                      <>
                        <div className="relative">
                          <label className="text-[9px] font-black uppercase tracking-wider opacity-50 mb-1 block">
                            New Password
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={`w-full h-12 pl-4 pr-10 rounded-xl border text-xs font-bold outline-none transition-all ${
                              isDarkMode
                                ? "bg-white/5 border-white/10 focus:border-emerald-500"
                                : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                            }`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-7 opacity-40 hover:opacity-100"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>

                        <div className="relative">
                          <label className="text-[9px] font-black uppercase tracking-wider opacity-50 mb-1 block">
                            Confirm New Password
                          </label>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full h-12 pl-4 pr-10 rounded-xl border text-xs font-bold outline-none transition-all ${
                              isDarkMode
                                ? "bg-white/5 border-white/10 focus:border-emerald-500"
                                : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                            }`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-7 opacity-40 hover:opacity-100"
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-wider opacity-50 mb-1 block">
                          New 5-Digit PIN
                        </label>
                        <input
                          type="password"
                          maxLength={5}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          placeholder="•••••"
                          className={`w-full h-12 px-4 rounded-xl border text-center text-lg font-black tracking-widest outline-none transition-all ${
                            isDarkMode
                              ? "bg-white/5 border-white/10 focus:border-emerald-500"
                              : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                          }`}
                          required
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all"
                    >
                      {actionLoading ? "Updating..." : "Confirm & Save"}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* DELETE ACCOUNT CONFIRMATION MODAL */}
            {activeModal === "delete" && (
              <div className="text-center pt-2">
                <div className="h-16 w-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                  <AlertTriangle size={30} />
                </div>

                <h3 className="text-xl font-black text-rose-500 mb-1">
                  Delete Account?
                </h3>
                <p className="text-[11px] font-bold opacity-60 uppercase tracking-widest mb-4">
                  Irreversible Action
                </p>

                <div
                  className={`p-4 rounded-2xl border text-left mb-6 ${
                    isDarkMode
                      ? "bg-white/5 border-white/5 text-zinc-300"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <p className="text-xs font-semibold leading-relaxed mb-3">
                    Are you sure you want to request permanent account deletion for{" "}
                    <span className="font-black text-white italic">{userData.full_name}</span>?
                  </p>
                  <ul className="text-[10px] space-y-1.5 opacity-80 list-disc list-inside">
                    <li>All active wallet balance will be cleared</li>
                    <li>Transaction histories will be permanently wiped</li>
                    <li>Account credentials will be permanently deactivated</li>
                  </ul>
                </div>

                <p className="text-[10px] opacity-40 mb-6 font-medium">
                  Clicking confirm will open WhatsApp to contact administrator manually for safety verification.
                </p>

                <div className="space-y-2.5">
                  <Button
                    onClick={handleConfirmDeleteAccount}
                    className="w-full h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
                  >
                    <span>Proceed to Delete Account</span>
                    <ExternalLink size={14} />
                  </Button>

                  <Button
                    onClick={() => setActiveModal(null)}
                    variant="ghost"
                    className={`w-full h-12 rounded-2xl font-black text-xs transition-all ${
                      isDarkMode ? "hover:bg-white/5 text-zinc-400" : "hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    Cancel, Keep Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}