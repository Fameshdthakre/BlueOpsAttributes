"use client";

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/app/lib/api';
import { PROVIDERS, DEFAULT_MODELS } from '@/app/lib/constants';

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{provider: string, ok: boolean, msg: string} | null>(null);

  useEffect(() => {
    const draft = localStorage.getItem('blueops_settings_draft');
    if (draft) {
      try {
        setConfig(JSON.parse(draft));
        setLoading(false);
        return;
      } catch(e) {}
    }

    api.getSettings().then(cfg => {
      // Ensure default values exist for advanced config
      PROVIDERS.forEach(p => {
        if (!cfg.providers[p]) cfg.providers[p] = {};
        if (cfg.providers[p].enabled === undefined) cfg.providers[p].enabled = true;
        if (cfg.providers[p].max_retries === undefined) cfg.providers[p].max_retries = 3;
        if (cfg.providers[p].timeout === undefined) cfg.providers[p].timeout = 60;
        if (cfg.providers[p].rpm_limit === undefined) cfg.providers[p].rpm_limit = 15;
        if (cfg.providers[p].temperature === undefined) cfg.providers[p].temperature = 0.1;
        if (cfg.providers[p].top_k === undefined) cfg.providers[p].top_k = 40;
        if (cfg.providers[p].top_p === undefined) cfg.providers[p].top_p = 0.95;
      });
      setConfig({...cfg});
      setLoading(false);
    });
  }, []);

  // Unsaved changes prompt
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (localStorage.getItem('blueops_settings_draft')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (
        target && 
        target.href && 
        target.href.startsWith(window.location.origin) && 
        !target.href.includes('/settings')
      ) {
        if (localStorage.getItem('blueops_settings_draft')) {
          if (!window.confirm("You have unsaved changes in Settings. Are you sure you want to leave without saving?")) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);

  // Save to draft on change
  const updateConfig = (newCfg: any) => {
    setConfig(newCfg);
    localStorage.setItem('blueops_settings_draft', JSON.stringify(newCfg));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveSettings(config);
      localStorage.removeItem('blueops_settings_draft');
      alert("Settings saved securely!");
    } catch (e: any) {
      alert("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (provider: string) => {
    const pCfg = config.providers[provider];
    if (!pCfg.api_key) {
      setTestResult({ provider, ok: false, msg: "API key is empty." });
      return;
    }
    setTestResult({ provider, ok: true, msg: "Testing..." });
    try {
      const res = await api.testConnection(provider, pCfg.api_key, pCfg.model);
      setTestResult({ provider, ok: res.ok, msg: res.message });
    } catch (e: any) {
      setTestResult({ provider, ok: false, msg: e.message });
    }
  };

  const availableProviders = useMemo(() => {
    if (!config) return PROVIDERS;
    return PROVIDERS.filter(p => config.providers[p].enabled && config.providers[p].api_key);
  }, [config]);

  // Ensure primary provider is in available
  useEffect(() => {
    if (config && availableProviders.length > 0 && !availableProviders.includes(config.primary_provider)) {
      updateConfig({ ...config, primary_provider: availableProviders[0] });
    }
  }, [availableProviders, config]);

  const handleCustomModel = (provider: string) => {
    const custom = window.prompt(`Enter custom model ID for ${provider}:`);
    if (custom && custom.trim() !== "") {
      const val = custom.trim();
      const currentCustom = config.custom_models[provider] || [];
      if (!currentCustom.includes(val)) {
        updateConfig({
          ...config,
          custom_models: {
            ...config.custom_models,
            [provider]: [...currentCustom, val]
          },
          providers: {
            ...config.providers,
            [provider]: {
              ...config.providers[provider],
              model: val
            }
          }
        });
      } else {
        updateConfig({
          ...config,
          providers: {
            ...config.providers,
            [provider]: {
              ...config.providers[provider],
              model: val
            }
          }
        });
      }
    }
  };

  if (loading || !config) return <div className="p-8 text-text-muted">Loading settings...</div>;

  const primary = config.primary_provider;
  const fb1Options = availableProviders.filter(p => p !== primary);
  
  let fb1 = config.fallback_order[0] || "";
  if (fb1 && !fb1Options.includes(fb1)) fb1 = "";

  const fb2Options = fb1Options.filter(p => p !== fb1);
  let fb2 = config.fallback_order[1] || "";
  if (fb2 && !fb2Options.includes(fb2)) fb2 = "";

  const updateFallback = (idx: number, val: string) => {
    const newFb = [...config.fallback_order];
    newFb[idx] = val;
    updateConfig({...config, fallback_order: newFb.filter(x => x !== "")});
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Settings</h1>
          <p className="text-text-muted mt-2">Manage API keys and provider configurations.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </header>

      {/* Priority & Fallback Card */}
      <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
        <h2 className="text-xl font-semibold mb-2 text-text-main flex items-center gap-2">
          <span>🎯</span> Provider Priority
        </h2>
        <p className="text-sm text-text-muted mb-6">The primary provider is queried first. Fallbacks are used on failure or unresolved results.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-text-muted mb-2">Primary</label>
            <select 
              value={primary}
              onChange={e => updateConfig({...config, primary_provider: e.target.value})}
              className="w-full bg-bg-input border-none rounded p-3 text-text-main"
            >
              {availableProviders.length === 0 ? <option value="">—</option> : null}
              {availableProviders.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-2">Fallback 1</label>
            <select 
              value={fb1}
              onChange={e => updateFallback(0, e.target.value)}
              className="w-full bg-bg-input border-none rounded p-3 text-text-main"
            >
              <option value="">—</option>
              {fb1Options.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-2">Fallback 2</label>
            <div className="w-full bg-bg-dark border border-bg-input rounded p-3 text-accent font-bold h-[48px] flex items-center">
              {fb2 || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-6" id="tour-api-keys">
        {PROVIDERS.map(provider => {
          const pCfg = config.providers[provider];
          const customModels = config.custom_models[provider] || [];
          const allModels = [...DEFAULT_MODELS[provider], ...customModels];
          
          return (
            <div key={provider} className={`bg-bg-card p-6 rounded-xl border ${pCfg.enabled ? 'border-bg-input' : 'border-bg-input/30 opacity-70'} transition-opacity`}>
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-bg-input">
                <h2 className="text-xl font-semibold text-text-main flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${provider === 'Gemini' ? 'bg-blue-500' : provider === 'OpenAI' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
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
                      onChange={e => updateConfig({
                        ...config, 
                        providers: {...config.providers, [provider]: {...pCfg, enabled: e.target.checked}}
                      })}
                      className="w-5 h-5 accent-status-success rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {testResult && testResult.provider === provider && (
                <div className={`mb-6 p-3 rounded text-sm font-medium ${testResult.ok ? 'bg-status-success/10 text-status-success border border-status-success/20' : 'bg-status-error/10 text-status-error border border-status-error/20'}`}>
                  {testResult.msg}
                </div>
              )}

              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm text-text-muted mb-2">API Key (Stored Encrypted)</label>
                  <input 
                    type="password"
                    placeholder="Enter API Key..."
                    value={pCfg.api_key}
                    onChange={e => updateConfig({
                      ...config, 
                      providers: {...config.providers, [provider]: {...pCfg, api_key: e.target.value}}
                    })}
                    className="w-full bg-bg-dark border border-bg-input rounded p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-text-muted mb-2">Model</label>
                  <div className="flex gap-2">
                    <select 
                      value={pCfg.model}
                      onChange={e => updateConfig({
                        ...config, 
                        providers: {...config.providers, [provider]: {...pCfg, model: e.target.value}}
                      })}
                      className="flex-1 bg-bg-input border-none rounded p-3 text-text-main"
                    >
                      {allModels.map((m: string) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button 
                      onClick={() => handleCustomModel(provider)}
                      className="bg-bg-dark border border-bg-input hover:bg-primary hover:border-primary px-4 rounded text-sm transition-colors"
                    >
                      ➕ Custom
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
                    onChange={e => updateConfig({
                      ...config, 
                      providers: {...config.providers, [provider]: {...pCfg, enable_web_search: e.target.checked}}
                    })}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                  />
                  <span className="text-sm text-text-main">🌐 Enable Web Search Grounding</span>
                </label>
              </div>

              {/* Advanced Configurations */}
              <div>
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Advanced Configurations</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Max Retries</label>
                    <input 
                      type="number" min="1" max="10"
                      value={pCfg.max_retries}
                      onChange={e => updateConfig({...config, providers: {...config.providers, [provider]: {...pCfg, max_retries: Number(e.target.value)}}})}
                      className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Timeout (s)</label>
                    <input 
                      type="number" min="10" max="300"
                      value={pCfg.timeout}
                      onChange={e => updateConfig({...config, providers: {...config.providers, [provider]: {...pCfg, timeout: Number(e.target.value)}}})}
                      className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">RPM Limit</label>
                    <input 
                      type="number" min="1" max="500"
                      value={pCfg.rpm_limit}
                      onChange={e => updateConfig({...config, providers: {...config.providers, [provider]: {...pCfg, rpm_limit: Number(e.target.value)}}})}
                      className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Temperature</label>
                    <input 
                      type="number" min="0" max="2" step="0.1"
                      value={pCfg.temperature}
                      onChange={e => updateConfig({...config, providers: {...config.providers, [provider]: {...pCfg, temperature: Number(e.target.value)}}})}
                      className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Top K</label>
                    <input 
                      type="number" min="1" max="100"
                      value={pCfg.top_k}
                      onChange={e => updateConfig({...config, providers: {...config.providers, [provider]: {...pCfg, top_k: Number(e.target.value)}}})}
                      className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Top P</label>
                    <input 
                      type="number" min="0" max="1" step="0.05"
                      value={pCfg.top_p}
                      onChange={e => updateConfig({...config, providers: {...config.providers, [provider]: {...pCfg, top_p: Number(e.target.value)}}})}
                      className="w-full bg-bg-dark border border-bg-input rounded p-2 text-sm text-accent font-bold"
                    />
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
