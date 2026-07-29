import Link from "next/link";
import Image from "next/image";
import { Database, ListChecks, Search, Zap, Lock, Download, FileSpreadsheet } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex flex-col items-center overflow-x-hidden">
      {/* Hero Section */}
      <section className="w-full max-w-6xl mx-auto px-6 pt-24 pb-16 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/20 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="relative z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold tracking-wider uppercase mb-6">
            Enterprise ASIN Extraction
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent leading-tight">
            Automate Attribute <br /> Extraction at Scale
          </h1>
          <p className="text-xl text-text-muted max-w-3xl mx-auto mb-10 leading-relaxed">
            The ultimate AI-powered bridge between messy e-commerce data and strict taxonomy validations. 
            Process thousands of ASINs concurrently with flawless accuracy.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
            <Link
              href="/signup"
              className="px-8 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all transform hover:scale-105 text-lg flex items-center justify-center gap-2"
            >
              Get Started for Free
              <Zap size={20} className="fill-current" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-bg-card hover:bg-bg-input border border-bg-input text-text-main font-bold rounded-xl transition-all text-lg flex items-center justify-center"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Dashboard Previews */}
        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6 items-center justify-center mt-8">
          {/* Input Dashboard Screenshot */}
          <div className="flex-1 w-full rounded-xl overflow-hidden border border-bg-input shadow-2xl shadow-black/80 transform md:rotate-[-2deg] hover:rotate-0 hover:scale-[1.02] hover:z-30 transition-all duration-500 bg-bg-card relative group">
             <div className="bg-bg-dark border-b border-bg-input px-4 py-2 flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-status-error/80"></div>
               <div className="w-3 h-3 rounded-full bg-status-warning/80"></div>
               <div className="w-3 h-3 rounded-full bg-status-success/80"></div>
               <span className="text-xs text-text-muted ml-2 font-mono">Attribute Master</span>
             </div>
             <div className="aspect-[4/3] sm:aspect-video md:aspect-[4/3] bg-bg-dark relative flex items-center justify-center text-text-muted">
                {/* Fallback text if image isn't named correctly yet */}
                <div className="absolute inset-0 flex items-center justify-center text-sm font-mono opacity-50 z-0">
                  Dashboard Preview
                </div>
                <img 
                  src="/dashboard-preview.png" 
                  alt="Dashboard Preview" 
                  className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity z-10 relative" 
                />
             </div>
          </div>

          {/* History Dashboard Screenshot */}
          <div className="flex-1 w-full rounded-xl overflow-hidden border border-bg-input shadow-2xl shadow-black/80 transform md:rotate-[2deg] hover:rotate-0 hover:scale-[1.02] hover:z-30 transition-all duration-500 md:-ml-12 z-20 mt-8 md:mt-0 bg-bg-card relative group">
             <div className="bg-bg-dark border-b border-bg-input px-4 py-2 flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-status-error/80"></div>
               <div className="w-3 h-3 rounded-full bg-status-warning/80"></div>
               <div className="w-3 h-3 rounded-full bg-status-success/80"></div>
               <span className="text-xs text-text-muted ml-2 font-mono">History & Export</span>
             </div>
             <div className="aspect-[4/3] sm:aspect-video md:aspect-[4/3] bg-bg-dark relative flex items-center justify-center text-text-muted">
                <div className="absolute inset-0 flex items-center justify-center text-sm font-mono opacity-50 z-0">
                  History Preview
                </div>
                <img 
                  src="/history-preview.png" 
                  alt="History Preview" 
                  className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity z-10 relative" 
                />
             </div>
          </div>
        </div>
      </section>

      {/* Supported Providers Banner */}
      <section className="w-full border-y border-bg-input bg-bg-card/50 py-10 mt-20 relative z-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-text-muted uppercase tracking-widest mb-6">
            Powered by industry-leading AI models
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-80">
            {/* OpenAI */}
            <div className="flex items-center gap-3 text-xl font-bold text-text-main">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A6.0651 6.0651 0 0 0 19.0192 19.818a5.9847 5.9847 0 0 0 3.9977-2.9 6.0462 6.0462 0 0 0-.735-7.0969zm-9.2611 11.5058a4.7987 4.7987 0 0 1-2.8733-.9354 1.5873 1.5873 0 0 0-.2277-.144L3.734 16.6713a1.4397 1.4397 0 0 1-.7184-1.2501v-4.067a1.4426 1.4426 0 0 1 .7184-1.2501l1.4116-.8144v5.3789a2.8687 2.8687 0 0 0 1.4344 2.483l4.4379 2.5626v2.6121zM2.8711 9.5312a4.793 4.793 0 0 1 2.2478-2.0223 1.582 1.582 0 0 0 .2375-.1199l6.1863-3.5714a1.4426 1.4426 0 0 1 1.4368 0l3.5226 2.0336a1.4426 1.4426 0 0 1 .7184 1.2501v1.6288L11.034 5.1508a2.8715 2.8715 0 0 0-2.8687 0L3.7273 7.7135v1.8177zM18.892 4.6543a4.7987 4.7987 0 0 1 2.8733.9354 1.5873 1.5873 0 0 0 .2277.144l6.1868 3.5723a1.4397 1.4397 0 0 1 .7184 1.2501v4.067a1.4426 1.4426 0 0 1-.7184 1.2501l-1.4116.8144V11.309a2.8687 2.8687 0 0 0-1.4344-2.483l-4.4379-2.5626V3.651zM21.1288 14.4687a4.793 4.793 0 0 1-2.2478 2.0223 1.582 1.582 0 0 0-.2375.1199l-6.1863 3.5714a1.4426 1.4426 0 0 1-1.4368 0l-3.5226-2.0336a1.4426 1.4426 0 0 1-.7184-1.2501v-1.6288l6.1864 3.5794a2.8715 2.8715 0 0 0 2.8687 0l4.438-2.5627v-1.8177zM5.108 19.3457a4.7987 4.7987 0 0 1-2.8733-.9354 1.5873 1.5873 0 0 0-.2277-.144l-6.1868-3.5723a1.4397 1.4397 0 0 1-.7184-1.2501v-4.067a1.4426 1.4426 0 0 1 .7184-1.2501l1.4116-.8144V12.691a2.8687 2.8687 0 0 0 1.4344 2.483l4.4379 2.5626v2.6121zM11.9999 15.115a3.1152 3.1152 0 1 1 0-6.2304 3.1152 3.1152 0 0 1 0 6.2304z" /></svg>
              OpenAI
            </div>
            {/* Anthropic */}
            <div className="flex items-center gap-3 text-xl font-bold text-text-main">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M17.653 11.594l-3.415-5.914a.276.276 0 0 0-.24-.138H13.84a.276.276 0 0 0-.24.138L4.694 21.096a.277.277 0 0 0 .24.414h1.705a.275.275 0 0 0 .239-.138l7.214-12.502 3.327 5.76a.275.275 0 0 1 0 .277l-2.072 3.59a.276.276 0 0 1-.24.138h-2.148l2.977-5.158-1.503-2.602-5.748 9.96A1.854 1.854 0 0 0 10.3 23.498h3.332a1.857 1.857 0 0 0 1.611-.928l3.968-6.87a.276.276 0 0 0 0-.276" /><path d="M13.255 13.916l1.353 2.343-1.636 2.836h-2.705z" /></svg>
              Anthropic
            </div>
            {/* Google Gemini */}
            <div className="flex items-center gap-3 text-xl font-bold text-text-main">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M23.149 11.026a1.272 1.272 0 0 0-.825-.826L13.792 7.15l-3.05-8.533a1.275 1.275 0 0 0-2.4 0l-3.05 8.533-8.532 3.05a1.274 1.274 0 0 0 0 2.4l8.533 3.05 3.05 8.532a1.275 1.275 0 0 0 2.4 0l3.05-8.532 8.532-3.05a1.272 1.272 0 0 0 .824-.824ZM12.593 18.06l-2.164-6.054-6.054-2.164 6.054-2.164 2.164-6.054 2.164 6.054 6.054 2.164-6.054 2.164-2.164 6.054Z" /></svg>
              Google Gemini
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="w-full max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-text-main">
            Built for E-Commerce Accuracy
          </h2>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            BlueOps doesn't just guess attributes. It strictly adheres to your defined taxonomies to ensure zero hallucinations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <div className="bg-bg-card border border-bg-input rounded-2xl p-8 hover:border-primary/50 transition-colors group">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
              <Lock size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Bring Your Own Key (BYOK)</h3>
            <p className="text-text-muted leading-relaxed">
              Total data privacy and zero markup. Plug in your own API keys for OpenAI, Anthropic, or Gemini and pay for direct usage only.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-bg-card border border-bg-input rounded-2xl p-8 hover:border-accent/50 transition-colors group">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
              <ListChecks size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Strict Validation Engine</h3>
            <p className="text-text-muted leading-relaxed">
              Provide a Taxonomy sheet with allowed dropdown values. Our engine forces the AI to map extracted features strictly to your allowed options.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-bg-card border border-bg-input rounded-2xl p-8 hover:border-blue-400/50 transition-colors group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">High-Concurrency Batching</h3>
            <p className="text-text-muted leading-relaxed">
              Don't wait hours for sequential processing. BlueOps fans out your requests concurrently, churning through thousands of ASINs in minutes.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-bg-card border border-bg-input rounded-2xl p-8 hover:border-purple-400/50 transition-colors group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <FileSpreadsheet size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Intelligent Excel Exports</h3>
            <p className="text-text-muted leading-relaxed">
              Instantly download color-coded match status reports. See exactly what was Validated, Free Text, Unresolved, or Failed.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="w-full bg-bg-card border-y border-bg-input py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-text-main">
              How It Works
            </h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto">
              Three simple steps to transform raw ASINs into structured catalog data.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-bg-input -translate-y-1/2 z-0"></div>
            
            {/* Step 1 */}
            <div className="flex-1 relative z-10 bg-bg-dark border border-bg-input p-6 rounded-2xl shadow-lg hover:-translate-y-2 transition-transform duration-300">
              <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center mb-4 absolute -top-5 left-6 shadow-lg shadow-primary/30">1</div>
              <h3 className="text-xl font-bold mt-2 mb-2">Upload ASINs</h3>
              <p className="text-sm text-text-muted leading-relaxed">Upload your ASIN list and map your columns. BlueOps automatically handles missing data formats.</p>
            </div>

            {/* Step 2 */}
            <div className="flex-1 relative z-10 bg-bg-dark border border-bg-input p-6 rounded-2xl shadow-lg hover:-translate-y-2 transition-transform duration-300">
              <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center mb-4 absolute -top-5 left-6 shadow-lg shadow-accent/30">2</div>
              <h3 className="text-xl font-bold mt-2 mb-2">Provide Taxonomy</h3>
              <p className="text-sm text-text-muted leading-relaxed">Upload your validation sheet to force the AI to select only from your approved dropdowns.</p>
            </div>

            {/* Step 3 */}
            <div className="flex-1 relative z-10 bg-bg-dark border border-bg-input p-6 rounded-2xl shadow-lg hover:-translate-y-2 transition-transform duration-300">
              <div className="w-10 h-10 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center mb-4 absolute -top-5 left-6 shadow-lg shadow-purple-500/30">3</div>
              <h3 className="text-xl font-bold mt-2 mb-2">Extract & Export</h3>
              <p className="text-sm text-text-muted leading-relaxed">Hit start and watch the AI churn through the queue. Export your results instantly to Excel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="w-full max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-bold mb-6 text-text-main">
          Ready to scale your extraction?
        </h2>
        <p className="text-text-muted mb-10 text-lg">
          Join BlueOps today and bring unparalleled accuracy to your e-commerce catalog.
        </p>
        <Link
          href="/signup"
          className="inline-flex px-10 py-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-2xl shadow-primary/20 transition-all transform hover:-translate-y-1 text-xl items-center gap-3"
        >
          Create Free Account
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
