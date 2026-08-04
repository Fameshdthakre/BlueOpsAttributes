"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { updateProfile, updatePassword } from "@/app/actions/user";
import toast from "react-hot-toast";
import { api } from "@/app/lib/api";
import { PROVIDERS, DEFAULT_MODELS } from "@/app/lib/constants";
import PageHeader from "@/app/components/PageHeader";

interface AppConfig {
  primary_provider: string;
  fallback_order: string[];
  custom_models: Record<string, string[]>;
  providers: Record<
    string,
    {
      enabled: boolean;
      api_key: string;
      model?: string;
      max_retries?: number;
      max_context_tokens?: number;
      timeout?: number;
      rpm_limit?: number;
      temperature?: number;
      top_k?: number;
      top_p?: number;
      enable_web_search?: boolean;
      search_depth?: string;
      max_results?: number;
      extract_depth?: string;
      enable_extract?: boolean;
      enable_search?: boolean;
      tavily_format?: string;
    }
  >;
}

const MultiKeyInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const keys = useMemo(() => {
    if (!value) return [""];
    const parsed = value
      .replace(/,/g, "\n")
      .split("\n")
      .map((k) => k.trim())
      .filter((k) => k);
    return parsed.length > 0 ? parsed : [""];
  }, [value]);

  const updateKeys = (newKeys: string[]) => {
    onChange(newKeys.filter((k) => k).join("\n"));
  };

  return (
    <div className="space-y-2">
      {keys.map((k, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            type="password"
            value={k}
            onChange={(e) => {
              const newK = [...keys];
              newK[idx] = e.target.value;
              updateKeys(newK);
            }}
            placeholder="Enter API Key..."
            className="w-full bg-bg-dark border border-bg-input rounded p-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const newK = keys.filter((_, i) => i !== idx);
              if (newK.length === 0) newK.push("");
              updateKeys(newK);
            }}
            className="p-3 text-status-error hover:bg-status-error/10 rounded transition-colors"
            title="Delete Key"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          updateKeys([...keys, ""]);
        }}
        className="text-xs font-semibold text-text-muted hover:text-text-main border border-bg-input hover:border-text-muted px-3 py-1.5 rounded transition-colors flex items-center gap-1 mt-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add API Key
      </button>
    </div>
  );
};

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
  const [activeTab, setActiveTab] = useState<"general" | "personal">("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (cfg.providers[p].max_context_tokens === undefined) {
          if (p === "Gemini") cfg.providers[p].max_context_tokens = 2000000;
          else if (p === "OpenAI") cfg.providers[p].max_context_tokens = 128000;
          else if (p === "Claude") cfg.providers[p].max_context_tokens = 200000;
          else cfg.providers[p].max_context_tokens = 8000;
        }
      });

      if (!cfg.providers.Tavily) {
        cfg.providers.Tavily = {
          enabled: true,
          api_key: "",
          search_depth: "advanced",
          max_results: 5,
          extract_depth: "advanced",
          enable_extract: true,
          enable_search: true,
          tavily_format: "markdown",
        };
      }

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
      const res = await api.testConnection(provider, pCfg.api_key || "", pCfg.model || "");
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
                      API Keys (Stored Encrypted)
                    </label>
                    <MultiKeyInput
                      value={pCfg.api_key || ""}
                      onChange={(val) =>
                        updateConfig({
                          ...config,
                          providers: {
                            ...config.providers,
                            [provider]: { ...pCfg, api_key: val },
                          },
                        })
                      }
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
                  <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 mt-6">
                    Advanced Configurations
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        min="1000"
                        max="2000000"
                        step="1000"
                        value={pCfg.max_context_tokens || 8000}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              [provider]: {
                                ...pCfg,
                                max_context_tokens: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                      />
                    </div>
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

        {/* Tavily AI Card */}
        {(() => {
          const tCfg = config.providers.Tavily || {
            enabled: true,
            api_key: "",
            search_depth: "advanced",
            max_results: 5,
            extract_depth: "advanced",
            enable_extract: true,
            enable_search: true,
          };

          return (
            <div
              className={`bg-bg-card p-6 rounded-xl border ${
                tCfg.enabled ? "border-purple-500/40" : "border-bg-input/30 opacity-70"
              } transition-opacity shadow-lg mt-6`}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-bg-input">
                <h2 className="text-xl font-semibold text-text-main flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></span>
                  Tavily AI (Deep Research & Extraction)
                </h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleTest("Tavily")}
                    className="text-sm bg-bg-dark border border-purple-500/30 hover:bg-purple-900/20 text-purple-300 px-4 py-2 rounded transition-colors"
                  >
                    Test Connection
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-text-muted">Enabled</span>
                    <input
                      type="checkbox"
                      checked={tCfg.enabled}
                      onChange={(e) =>
                        updateConfig({
                          ...config,
                          providers: {
                            ...config.providers,
                            Tavily: {
                              ...tCfg,
                              enabled: e.target.checked,
                            },
                          },
                        })
                      }
                      className="w-5 h-5 accent-purple-500 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {testResult && testResult.provider === "Tavily" && (
                <div
                  className={`mb-6 p-3 rounded text-sm font-medium ${
                    testResult.ok
                      ? "bg-status-success/10 text-status-success border border-status-success/20"
                      : "bg-status-error/10 text-status-error border border-status-error/20"
                  }`}
                >
                  {testResult.msg}
                </div>
              )}

              {/* API Key */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm text-text-muted mb-2">
                    Tavily API Keys (Stored Encrypted)
                  </label>
                  <MultiKeyInput
                    value={tCfg.api_key || ""}
                    onChange={(val) =>
                      updateConfig({
                        ...config,
                        providers: {
                          ...config.providers,
                          Tavily: { ...tCfg, api_key: val },
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-2">
                    Search Depth
                  </label>
                  <select
                    value={tCfg.search_depth || "advanced"}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        providers: {
                          ...config.providers,
                          Tavily: { ...tCfg, search_depth: e.target.value },
                        },
                      })
                    }
                    className="w-full bg-bg-input border-none rounded p-3 text-text-main"
                  >
                    <option value="advanced">Advanced (Deep Search + AI Answer)</option>
                    <option value="basic">Basic (Fast Search)</option>
                  </select>
                </div>
              </div>

              {/* Advanced Configurations */}
              <div>
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">
                  Deep Research & Extraction Options
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      Content Format
                    </label>
                    <select
                      value={tCfg.tavily_format || "markdown"}
                      onChange={(e) =>
                        updateConfig({
                          ...config,
                          providers: {
                            ...config.providers,
                            Tavily: { ...tCfg, tavily_format: e.target.value },
                          },
                        })
                      }
                      className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                    >
                      <option value="markdown">Markdown</option>
                      <option value="text">Raw Text</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      Max Search Results
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={tCfg.max_results || 5}
                      onChange={(e) =>
                        updateConfig({
                          ...config,
                          providers: {
                            ...config.providers,
                            Tavily: {
                              ...tCfg,
                              max_results: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      Extraction Depth
                    </label>
                    <select
                      value={tCfg.extract_depth || "advanced"}
                      onChange={(e) =>
                        updateConfig({
                          ...config,
                          providers: {
                            ...config.providers,
                            Tavily: { ...tCfg, extract_depth: e.target.value },
                          },
                        })
                      }
                      className="w-full bg-bg-input border-none rounded p-2 text-sm text-text-main"
                    >
                      <option value="advanced">Advanced Extraction</option>
                      <option value="basic">Basic Extraction</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tCfg.enable_search ?? true}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              Tavily: {
                                ...tCfg,
                                enable_search: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-5 h-5 accent-purple-500 rounded cursor-pointer"
                      />
                      <span className="text-sm text-text-main font-medium">
                        Enable Web Search
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tCfg.enable_extract ?? true}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            providers: {
                              ...config.providers,
                              Tavily: {
                                ...tCfg,
                                enable_extract: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-5 h-5 accent-purple-500 rounded cursor-pointer"
                      />
                      <span className="text-sm text-text-main font-medium">
                        Enable URL Extraction
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
          </>
        )}
      </div>
    </div>
  );
}
