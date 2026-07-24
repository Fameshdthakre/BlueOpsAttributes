"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PROVIDERS, DEFAULT_MODELS } from '@/lib/constants';

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{provider: string, ok: boolean, msg: string} | null>(null);

  useEffect(() => {
    api.getSettings().then(cfg => {
      setConfig(cfg);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveSettings(config);
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

  if (loading || !config) return <div className="p-8 text-text-muted">Loading settings...</div>;

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

      {/* Global Config */}
      <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
        <h2 className="text-xl font-semibold mb-4 text-text-main">Priority & Fallback</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-text-muted mb-2">Primary Provider</label>
            <select 
              value={config.primary_provider}
              onChange={e => setConfig({...config, primary_provider: e.target.value})}
              className="w-full bg-bg-input border-none rounded p-3 text-text-main"
            >
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-2">Fallback Order (Comma separated)</label>
            <input 
              type="text"
              value={config.fallback_order.join(", ")}
              onChange={e => setConfig({...config, fallback_order: e.target.value.split(",").map(s => s.trim())})}
              className="w-full bg-bg-input border-none rounded p-3 text-text-main"
            />
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-6">
        {PROVIDERS.map(provider => {
          const pCfg = config.providers[provider];
          const customModels = config.custom_models[provider] || [];
          const allModels = [...DEFAULT_MODELS[provider], ...customModels];
          
          return (
            <div key={provider} className="bg-bg-card p-6 rounded-xl border border-bg-input">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-text-main flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${provider === 'Gemini' ? 'bg-blue-500' : provider === 'OpenAI' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                  {provider}
                </h2>
                <button 
                  onClick={() => handleTest(provider)}
                  className="text-sm bg-bg-input hover:bg-slate-600 px-4 py-2 rounded transition-colors"
                >
                  Test Connection
                </button>
              </div>

              {testResult && testResult.provider === provider && (
                <div className={`mb-6 p-3 rounded text-sm ${testResult.ok ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'}`}>
                  {testResult.msg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text-muted mb-2">API Key (Stored Encrypted)</label>
                  <input 
                    type="password"
                    placeholder="Enter API Key..."
                    value={pCfg.api_key}
                    onChange={e => setConfig({
                      ...config, 
                      providers: {...config.providers, [provider]: {...pCfg, api_key: e.target.value}}
                    })}
                    className="w-full bg-bg-dark border border-bg-input rounded p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-text-muted mb-2">Model</label>
                  <select 
                    value={pCfg.model}
                    onChange={e => setConfig({
                      ...config, 
                      providers: {...config.providers, [provider]: {...pCfg, model: e.target.value}}
                    })}
                    className="w-full bg-bg-input border-none rounded p-3 text-text-main"
                  >
                    {allModels.map((m: string) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-2">Rate Limit (RPM)</label>
                  <input 
                    type="number"
                    value={pCfg.rpm_limit}
                    onChange={e => setConfig({
                      ...config, 
                      providers: {...config.providers, [provider]: {...pCfg, rpm_limit: Number(e.target.value)}}
                    })}
                    className="w-full bg-bg-input border-none rounded p-3 text-text-main"
                  />
                </div>

                <div className="flex items-center gap-3 pt-8">
                  <input 
                    type="checkbox" 
                    id={`${provider}-web`}
                    checked={pCfg.enable_web_search}
                    onChange={e => setConfig({
                      ...config, 
                      providers: {...config.providers, [provider]: {...pCfg, enable_web_search: e.target.checked}}
                    })}
                    className="w-5 h-5 accent-primary rounded cursor-pointer bg-bg-input border-none"
                  />
                  <label htmlFor={`${provider}-web`} className="text-sm text-text-main cursor-pointer">Enable Web Search Grounding</label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
