"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { updateProfile, updatePassword } from "@/app/actions/user";
import toast from "react-hot-toast";
import { api } from "@/app/lib/api";
import { PROVIDERS, DEFAULT_MODELS } from "@/app/lib/constants";
import PageHeader from "@/app/components/PageHeader";
import { useExtension } from "@/app/components/ExtensionSync";

interface AppConfig {
  primary_provider: string;
  fallback_order: string[];
  custom_models: Record<string, string[]>;
  providers: Record<
    string,
    {
      enabled: boolean;
      api_key: string;
      model: string;
      max_retries: number;
      timeout: number;
      rpm_limit: number;
      temperature: number;
      top_k: number;
      top_p: number;
      enable_web_search?: boolean;
    }
  >;
  marketplace_config?: {
    default_marketplace: string;
    zip_codes: Record<string, string>;
  };
}

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    provider: string;
    ok: boolean;
    msg: string;
  } | null>(null);

  const { data: session, update: updateSession } = useSession();
  const [activeTab, setActiveTab] = useState<"general" | "personal" | "integrations" | "marketplace">("general");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status: extStatus, lastSynced, recheck: recheckExtension } = useExtension();
  
  // API Token State
  const [tokens, setTokens] = useState<any[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "integrations") {
      setTokenLoading(true);
      api.getTokens().then(data => {
        setTokens(data.tokens);
      }).catch(err => {
        toast.error("Failed to load tokens");
      }).finally(() => {
        setTokenLoading(false);
      });
    }
  }, [activeTab]);

  const handleRegenerateToken = async () => {
    if (!confirm("Are you sure? This will invalidate any existing API tokens.")) return;
    try {
      const data = await api.regenerateToken("Extension Default Token");
      setNewToken(data.token);
      toast.success("New token generated!");
      // Reload tokens list
      const updated = await api.getTokens();
      setTokens(updated.tokens);
    } catch (e: any) {
      toast.error("Failed to generate token: " + e.message);
    }
  };

  const copyToken = (tokenStr: string) => {
    navigator.clipboard.writeText(tokenStr);
    toast.success("Token copied to clipboard!");
  };

  // Profile Form State
  const [profileName, setProfileName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setProfileName(session.user.name);
      if (session.user.image) setProfileImage(session.user.image);
    }
  }, [session]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const formData = new FormData();
    formData.append("name", profileName);
    formData.append("image", profileImage);

    const res = await updateProfile(formData);
    if (res.error) {
      toast.error(res.error);
    } else {
      await updateSession({
        ...session,
        name: profileName,
        image: profileImage,
      });
      toast.success("Profile updated successfully!");
    }
    setSavingProfile(false);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    setSavingPassword(true);
    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);

    const res = await updatePassword(formData);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  useEffect(() => {
    const draft = localStorage.getItem("blueops_settings_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as AppConfig;
        setTimeout(() => {
          setConfig(parsed);
          setLoading(false);
        }, 0);
        return;
      } catch (err) {
        // ignore parse error
      }
    }

    api.getSettings().then((cfg) => {
      // Ensure default values exist for advanced config
      PROVIDERS.forEach((p) => {
        if (!cfg.providers[p]) cfg.providers[p] = {};
        if (cfg.providers[p].enabled === undefined)
          cfg.providers[p].enabled = true;
        if (cfg.providers[p].max_retries === undefined)
          cfg.providers[p].max_retries = 3;
        if (cfg.providers[p].timeout === undefined)
          cfg.providers[p].timeout = 60;
        if (cfg.providers[p].rpm_limit === undefined)
          cfg.providers[p].rpm_limit = 15;
        if (cfg.providers[p].temperature === undefined)
          cfg.providers[p].temperature = 0.1;
        if (cfg.providers[p].top_k === undefined) cfg.providers[p].top_k = 40;
        if (cfg.providers[p].top_p === undefined) cfg.providers[p].top_p = 0.95;
      });
      setConfig({ ...cfg });
      setLoading(false);
    });
  }, []);


  // Save to draft on change
  const updateConfig = (newCfg: AppConfig) => {
    setConfig(newCfg);
    localStorage.setItem("blueops_settings_draft", JSON.stringify(newCfg));
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.saveSettings(config);
      localStorage.removeItem("blueops_settings_draft");
      alert("Settings saved securely!");
    } catch (err: unknown) {
      const e = err as Error;
      alert("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (provider: string) => {
    if (!config) return;
    const pCfg = config.providers[provider];
    if (!pCfg.api_key) {
      setTestResult({ provider, ok: false, msg: "API key is empty." });
      return;
    }
    setTestResult({ provider, ok: true, msg: "Testing..." });
    try {
      const res = await api.testConnection(provider, pCfg.api_key, pCfg.model);
      setTestResult({ provider, ok: res.ok, msg: res.message });
    } catch (err: unknown) {
      const e = err as Error;
      setTestResult({ provider, ok: false, msg: e.message });
    }
  };

  const availableProviders = useMemo(() => {
    if (!config) return PROVIDERS;
    return PROVIDERS.filter(
      (p) => config.providers[p].enabled && config.providers[p].api_key,
    );
  }, [config]);

  useEffect(() => {
    const currentConfig = config;
    if (
      currentConfig &&
      availableProviders.length > 0 &&
      !availableProviders.includes(currentConfig.primary_provider)
    ) {
      setTimeout(() => {
        updateConfig({ ...currentConfig, primary_provider: availableProviders[0] });
      }, 0);
    }
  }, [availableProviders, config]);

  const handleCustomModel = (provider: string) => {
    if (!config) return;
    const custom = window.prompt(`Enter custom model ID for ${provider}:`);
    if (custom && custom.trim() !== "") {
      const val = custom.trim();
      const currentCustom = config.custom_models[provider] || [];
      if (!currentCustom.includes(val)) {
        updateConfig({
          ...config,
          custom_models: {
            ...config.custom_models,
            [provider]: [...currentCustom, val],
          },
          providers: {
            ...config.providers,
            [provider]: {
              ...config.providers[provider],
              model: val,
            },
          },
        });
      } else {
        updateConfig({
          ...config,
          providers: {
            ...config.providers,
            [provider]: {
              ...config.providers[provider],
              model: val,
            },
          },
        });
      }
    }
  };

  if (loading || !config)
    return <div className="p-8 text-text-muted">Loading settings...</div>;

  const primary = config.primary_provider;
  const fb1Options = availableProviders.filter((p) => p !== primary);

  let fb1 = config.fallback_order[0] || "";
  if (fb1 && !fb1Options.includes(fb1)) fb1 = "";

  const fb2Options = fb1Options.filter((p) => p !== fb1);
  let fb2 = config.fallback_order[1] || "";
  if (fb2 && !fb2Options.includes(fb2)) fb2 = "";

  const updateFallback = (idx: number, val: string) => {
    if (!config) return;
    const newFb = [...config.fallback_order];
    newFb[idx] = val;
    updateConfig({ ...config, fallback_order: newFb.filter((x) => x !== "") });
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="Settings"
        subtitle="Manage API keys and provider configurations."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/" },
          { label: "Settings" },
        ]}
      >
        {activeTab === "general" && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors text-sm"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        )}
      </PageHeader>

      <div className="flex border-b border-bg-input px-8 mt-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "general"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          General (API Keys)
        </button>
        <button
          onClick={() => setActiveTab("personal")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "personal"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          Personal Settings
        </button>
        <button
          onClick={() => setActiveTab("integrations")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "integrations"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          Integrations
        </button>
        <button
          onClick={() => setActiveTab("marketplace")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "marketplace"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          Marketplace
        </button>
      </div>

      <div className="p-8 max-w-5xl mx-auto space-y-8 overflow-y-auto flex-1 pb-20 w-full">
        {activeTab === "personal" && (
          <div className="space-y-8">
            <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
              <h2 className="text-xl font-semibold mb-6 text-text-main">Profile Settings</h2>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-bg-dark border-2 border-bg-input flex items-center justify-center">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl text-text-muted">
                          {session?.user?.email?.substring(0, 2).toUpperCase() || "BO"}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Change
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-text-muted mb-2">Display Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-bg-dark border border-bg-input rounded p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none max-w-md"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </div>

            <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
              <h2 className="text-xl font-semibold mb-6 text-text-main">Change Password</h2>
              <form onSubmit={handleSavePassword} className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm text-text-muted mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full bg-bg-dark border border-bg-input rounded p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-bg-dark border border-bg-input rounded p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-bg-dark border border-bg-input rounded p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "general" && (
          <>
        {/* Priority & Fallback Card */}
        <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
          <h2 className="text-xl font-semibold mb-2 text-text-main flex items-center gap-2">
            <svg
              className="w-6 h-6 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Provider Priority
          </h2>
          <p className="text-sm text-text-muted mb-6">
            The primary provider is queried first. Fallbacks are used on failure
            or unresolved results.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-text-muted mb-2">
                Primary
              </label>
              <select
                value={primary}
                onChange={(e) =>
                  updateConfig({ ...config, primary_provider: e.target.value })
                }
                className="w-full bg-bg-input border-none rounded p-3 text-text-main"
              >
                {availableProviders.length === 0 ? (
                  <option value="">—</option>
                ) : null}
                {availableProviders.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-2">
                Fallback 1
              </label>
              <select
                value={fb1}
                onChange={(e) => updateFallback(0, e.target.value)}
                className="w-full bg-bg-input border-none rounded p-3 text-text-main"
              >
                <option value="">—</option>
                {fb1Options.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-2">
                Fallback 2
              </label>
              <div className="w-full bg-bg-dark border border-bg-input rounded p-3 text-accent font-bold h-[48px] flex items-center">
                {fb2 || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Provider Cards */}
        <div className="space-y-6">
          {PROVIDERS.map((provider) => {
            const pCfg = config.providers[provider];
            const customModels = config.custom_models[provider] || [];
            const allModels = [...DEFAULT_MODELS[provider], ...customModels];

            return (
              <div
                key={provider}
                id={provider === "Gemini" ? "tour-api-keys" : undefined}
                className={`bg-bg-card p-6 rounded-xl border ${pCfg.enabled ? "border-bg-input" : "border-bg-input/30 opacity-70"} transition-opacity`}
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-bg-input">
                  <h2 className="text-xl font-semibold text-text-main flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${provider === "Gemini" ? "bg-blue-500" : provider === "OpenAI" ? "bg-green-500" : "bg-orange-500"}`}
                    ></span>
                    {provider}
                  </h2>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleTest(provider)}
                      className="text-sm bg-bg-dark border border-bg-input hover:bg-slate-700 px-4 py-2 rounded transition-colors"
                    >
                      Test Connection
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-text-muted">Enabled</span>
                      <input
                        type="checkbox"
                        checked={pCfg.enabled}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              [provider]: {
                                ...pCfg,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-5 h-5 accent-status-success rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {testResult && testResult.provider === provider && (
                  <div
                    className={`mb-6 p-3 rounded text-sm font-medium ${testResult.ok ? "bg-status-success/10 text-status-success border border-status-success/20" : "bg-status-error/10 text-status-error border border-status-error/20"}`}
                  >
                    {testResult.msg}
                  </div>
                )}

                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">
                      API Key (Stored Encrypted)
                    </label>
                    <input
                      type="password"
                      placeholder="Enter API Key..."
                      value={pCfg.api_key}
                      onChange={(e) =>
                        updateConfig({
                          ...config,
                          providers: {
                            ...config.providers,
                            [provider]: { ...pCfg, api_key: e.target.value },
                          },
                        })
                      }
                      className="w-full bg-bg-dark border border-bg-input rounded p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-muted mb-2">
                      Model
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={pCfg.model}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              [provider]: { ...pCfg, model: e.target.value },
                            },
                          })
                        }
                        className="flex-1 bg-bg-input border-none rounded p-3 text-text-main"
                      >
                        {allModels.map((m: string) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleCustomModel(provider)}
                        className="bg-bg-dark border border-bg-input hover:bg-primary hover:border-primary px-4 rounded text-sm transition-colors flex items-center gap-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Custom
                      </button>
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="mb-6 pb-6 border-b border-bg-input">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pCfg.enable_web_search}
                      onChange={(e) =>
                        updateConfig({
                          ...config,
                          providers: {
                            ...config.providers,
                            [provider]: {
                              ...pCfg,
                              enable_web_search: e.target.checked,
                            },
                          },
                        })
                      }
                      className="w-5 h-5 accent-primary rounded cursor-pointer"
                    />
                    <span className="text-sm text-text-main flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                      Enable Web Search Grounding
                    </span>
                  </label>
                </div>

                {/* Advanced Configurations */}
                <div>
                  <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">
                    Advanced Configurations
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Max Retries
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={pCfg.max_retries}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              [provider]: {
                                ...pCfg,
                                max_retries: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Timeout (s)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={pCfg.timeout}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              [provider]: {
                                ...pCfg,
                                timeout: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        RPM Limit
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={pCfg.rpm_limit}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              [provider]: {
                                ...pCfg,
                                rpm_limit: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Temperature
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={pCfg.temperature}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              [provider]: {
                                ...pCfg,
                                temperature: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Top K
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={pCfg.top_k}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              [provider]: {
                                ...pCfg,
                                top_k: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Top P
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={pCfg.top_p}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              [provider]: {
                                ...pCfg,
                                top_p: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}

        {activeTab === "integrations" && (
          <div className="space-y-8">

            {/* ── Extension Status Card ─────────────────────────────── */}
            <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-text-main flex items-center gap-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                  BlueOps Enterprise Extension
                </h2>
                <button
                  onClick={recheckExtension}
                  className="text-xs px-3 py-1.5 bg-bg-dark border border-bg-input rounded-lg text-text-muted hover:text-text-main transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Recheck
                </button>
              </div>

              <div className={`flex items-center gap-4 p-4 rounded-xl border ${
                extStatus === "connected"
                  ? "bg-green-500/5 border-green-500/20"
                  : extStatus === "checking"
                  ? "bg-yellow-500/5 border-yellow-500/20"
                  : "bg-red-500/5 border-red-500/30"
              }`}>
                {/* Animated status dot */}
                <div className="relative flex-shrink-0">
                  <span className={`w-4 h-4 rounded-full block ${
                    extStatus === "connected" ? "bg-green-500"
                    : extStatus === "checking" ? "bg-yellow-400"
                    : "bg-red-500"
                  }`} />
                  {extStatus === "connected" && (
                    <span className="absolute inset-0 w-4 h-4 rounded-full bg-green-500 animate-ping opacity-60" />
                  )}
                  {extStatus === "checking" && (
                    <span className="absolute inset-0 w-4 h-4 rounded-full bg-yellow-400 animate-ping opacity-60" />
                  )}
                </div>

                <div className="flex-1">
                  <div className={`font-bold text-lg ${
                    extStatus === "connected" ? "text-green-400"
                    : extStatus === "checking" ? "text-yellow-300"
                    : "text-red-400"
                  }`}>
                    {extStatus === "connected" ? "✓ Extension Connected & Active"
                    : extStatus === "checking" ? "⏳ Checking for Extension..."
                    : "✗ Extension Not Detected"}
                  </div>
                  <div className="text-sm text-text-muted mt-0.5">
                    {extStatus === "connected" && lastSynced
                      ? `API token synced automatically · Last seen: ${lastSynced.toLocaleTimeString()}`
                      : extStatus === "checking"
                      ? "Waiting for the extension to respond..."
                      : "Load the BlueOps Enterprise Toolkit extension in Chrome to connect."}
                  </div>
                </div>

                {extStatus === "disconnected" && (
                  <a
                    href="https://github.com/Fameshdthakre/BlueOpsAttributes/tree/main/extension"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 text-xs bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Setup Guide →
                  </a>
                )}
              </div>

              {extStatus === "connected" && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Attribute Master", icon: "⚡" },
                    { label: "Image Auditor", icon: "🖼" },
                    { label: "Listing Scraper", icon: "📋" },
                  ].map((f) => (
                    <div key={f.label} className="p-3 bg-bg-dark border border-green-500/20 rounded-lg flex items-center gap-2 text-sm">
                      <span>{f.icon}</span>
                      <span className="text-text-main font-medium">{f.label}</span>
                      <span className="ml-auto text-green-400 text-xs font-bold">READY</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── API Tokens Card ───────────────────────────────────── */}
            <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-text-main flex items-center gap-2">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  API Tokens
                </h2>
                <button
                  onClick={handleRegenerateToken}
                  className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  Regenerate Token
                </button>
              </div>
              <p className="text-sm text-text-muted mb-6">
                Use your API token to authenticate Chrome Extensions (A+ Publisher, Image Auditor, Listing Scraper).
                This token acts as your password—keep it secret!
              </p>
              
              {newToken && (
                <div className="mb-6 p-4 bg-status-success/10 border border-status-success/20 rounded-lg">
                  <p className="text-status-success font-semibold mb-2">New token generated! Please copy it now, it won't be shown again.</p>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 p-3 bg-bg-dark border border-bg-input rounded font-mono text-white select-all break-all">{newToken}</code>
                    <button onClick={() => copyToken(newToken)} className="p-3 bg-bg-input hover:bg-bg-dark rounded transition-colors text-text-main" title="Copy">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-main mb-2">Active Tokens</h3>
                {tokenLoading ? (
                  <div className="text-sm text-text-muted">Loading tokens...</div>
                ) : tokens.length === 0 ? (
                  <div className="text-sm text-text-muted">No active tokens. Generate one to connect extensions.</div>
                ) : (
                  tokens.map(token => (
                    <div key={token.id} className="p-4 bg-bg-dark border border-bg-input rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-text-main">{token.label}</div>
                        <div className="text-xs text-text-muted mt-1">
                          Created: {new Date(token.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-text-main">
                          {token.last_used_tool ? `Last used by ${token.last_used_tool}` : "Never used"}
                        </div>
                        {token.last_used_at && (
                          <div className="text-xs text-text-muted mt-1">
                            {new Date(token.last_used_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
              <h2 className="text-xl font-semibold text-text-main mb-1">How to Set Up</h2>
              <p className="text-sm text-text-muted mb-5">The BlueOps Enterprise Extension is headless (no popup). Follow these steps to get started.</p>
              <div className="space-y-3">
                {[
                  { step: "1", title: "Download the Extension", desc: "Go to the GitHub repo and download the extension/ folder, or clone the repository locally." },
                  { step: "2", title: "Load in Chrome", desc: 'Open chrome://extensions → Enable "Developer Mode" (top-right) → Click "Load unpacked" → Select the extension/ folder.' },
                  { step: "3", title: "Log In to BlueOps", desc: "Simply log in to this web app. Your API token is synced to the extension silently and automatically — no copy-pasting needed!" },
                  { step: "4", title: "Verify Connection", desc: "Check the \"Extension Status\" card above. If it shows green and Connected, you are ready to use all features." },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-4 p-4 bg-bg-dark rounded-lg border border-bg-input">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">{step}</div>
                    <div>
                      <h4 className="font-semibold text-text-main">{title}</h4>
                      <p className="text-sm text-text-muted mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "marketplace" && (
          <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
            <h2 className="text-xl font-semibold mb-6 text-text-main flex items-center gap-2">
              <svg className="w-6 h-6 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Marketplace Defaults
            </h2>
            <p className="text-sm text-text-muted mb-6">
              Set your default Amazon marketplace and override delivery zip codes for scraper accuracy.
            </p>
            
            <div className="mb-8 max-w-sm">
              <label className="block text-sm text-text-muted mb-2">Default Marketplace</label>
              <select
                value={config?.marketplace_config?.default_marketplace || "Amazon.com"}
                onChange={(e) => {
                  if (config) {
                    updateConfig({
                      ...config,
                      marketplace_config: {
                        ...(config.marketplace_config || { zip_codes: {} }),
                        default_marketplace: e.target.value
                      }
                    });
                  }
                }}
                className="w-full bg-bg-input border-none rounded p-3 text-text-main"
              >
                {Object.keys(config?.marketplace_config?.zip_codes || {}).map(mkt => (
                  <option key={mkt} value={mkt}>{mkt}</option>
                ))}
              </select>
            </div>
            
            <h3 className="text-md font-semibold text-text-main mb-4">Zip Code Overrides</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(config?.marketplace_config?.zip_codes || {}).map(([mkt, zip]) => (
                <div key={mkt} className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">{mkt}</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => {
                      if (config && config.marketplace_config) {
                        updateConfig({
                          ...config,
                          marketplace_config: {
                            ...config.marketplace_config,
                            zip_codes: {
                              ...config.marketplace_config.zip_codes,
                              [mkt]: e.target.value
                            }
                          }
                        });
                      }
                    }}
                    className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-text-main focus:border-primary outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
