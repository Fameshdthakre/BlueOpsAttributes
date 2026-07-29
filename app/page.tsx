import Link from "next/link";
import { Database, ListChecks, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-dark text-white p-6 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            Welcome to BlueOps
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            You're all set! Here's a quick look at how to get the most out of our AI-Powered ASIN Attribute Extraction.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Step 1 */}
          <div className="bg-bg-card border border-bg-input rounded-2xl p-8 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all"></div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6">
              <Database size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">1. Connect Database</h3>
            <p className="text-gray-400 leading-relaxed">
              Link your products safely. BlueOps seamlessly connects to your ASIN data, ensuring secure and fast processing.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-bg-card border border-bg-input rounded-2xl p-8 relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all"></div>
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
              <ListChecks size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">2. Define Attributes</h3>
            <p className="text-gray-400 leading-relaxed">
              Tell the AI what you want to extract. Create custom schemas for colors, sizes, materials, and more.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-bg-card border border-bg-input rounded-2xl p-8 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-all"></div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-6">
              <Search size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">3. Extract Insights</h3>
            <p className="text-gray-400 leading-relaxed">
              Run the extraction! BlueOps uses advanced LLMs to parse and structure attribute data perfectly.
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="px-8 py-4 bg-bg-card hover:bg-bg-input border border-bg-input text-white font-bold rounded-xl transition-all text-lg flex items-center justify-center"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all text-lg flex items-center gap-2 group"
          >
            Get Started
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
