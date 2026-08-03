# BlueOps | ASIN Attributes Master

An AI-powered orchestration tool designed to automatically extract and validate Amazon Standard Identification Number (ASIN) attributes. By leveraging cutting-edge LLMs (OpenAI, Gemini, Claude), this application can parse product pages or raw data, extract specific attributes, and validate them against predefined taxonomy rules.

## ✨ Features

- **Multi-Model Support**: Dynamically route queries through OpenAI, Google Gemini, or Anthropic Claude (Updated to latest SDKs).
- **Web Search Augmentation**: Optionally enable Tavily Web Search to allow AI models to research ASINs live before extraction.
- **Fallback Logic**: Automatically fallback to secondary AI providers if the primary one fails or rate-limits.
- **Batch Processing**: Upload Excel/CSV files containing thousands of ASINs and process them concurrently.
- **Smart Validation**: Uses fuzzy matching (`rapidfuzz`) to validate extracted values against allowed dropdown options for specific product types.
- **Real-time Tracking**: Monitor progress, view session history, and inspect detailed extraction confidence scores.
- **Export Ready**: Download the final validated data for immediate use.

## 🛠️ Tech Stack

**Frontend**

- Next.js (App Router)
- React 19 + TypeScript
- Tailwind CSS v4

**Backend (Serverless)**

- Python 3.12 (Strictly Pinned)
- FastAPI
- PostgreSQL (`psycopg2-binary`) for session tracking
- `google-genai` (1.1x), `openai`, `anthropic`, and `tavily-python` SDKs

## ⚙️ Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js** (v20 or higher)
- **Python** (v3.12 or higher)
- **PostgreSQL Database** (Local or cloud-hosted like Supabase/Neon)
- **API Keys** for at least one AI provider (OpenAI, Gemini, or Anthropic)
- **Tavily API Key** (Optional, for web search augmentation)

## 🔑 Environment Variables

Create a `.env.local` file in the root directory and add the following variables. (Ensure your PostgreSQL database is running and accessible).

```env
# Database Connection
POSTGRES_URL="postgres://user:password@localhost:5432/blueops_db"

# Security (Required for encrypting API keys in the database)
# You can generate a fernet key using python: `from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())`
ENCRYPTION_KEY="your-base64-fernet-key="

# (Optional) You can also configure API keys via the Settings UI in the app.
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
TAVILY_API_KEY=your_tavily_api_key
```

## 🚀 Getting Started

### 1. Install Frontend Dependencies

```bash
npm install
# or
yarn install
```

### 2. Install Backend Dependencies

The backend relies on Python. It is highly recommended to use a virtual environment:

```bash
python -m venv venv
# Activate on Windows:
venv\Scripts\activate
# Activate on Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📁 Project Structure

```text
├── app/                  # Next.js Frontend (Pages, Components, Lib, Layouts)
│   ├── components/       # Reusable React components (Sidebar, Providers, etc.)
│   ├── lib/              # Frontend utilities and API wrappers
│   └── ...               # Route pages (Input, Process, History, Settings)
├── api/                  # Python Serverless API Endpoints (Vercel compatible)
├── backend/              # Core Python logic (Validation, Models, Processors, LLM integrations)
├── public/               # Static assets (Logos)
├── requirements.txt      # Python dependencies
└── vercel.json           # Vercel deployment configuration
```

## ☁️ Deployment

This project is optimized for deployment on **Vercel**.

1. Push your code to a Git repository (GitHub/GitLab).
2. Import the project into Vercel.
3. Ensure you add your `POSTGRES_URL` and `ENCRYPTION_KEY` to Vercel's Environment Variables.
4. Vercel will automatically detect the Next.js frontend and build the Python backend located in the `/api` folder using its zero-config serverless environment.

> **Note**: For production deployments, the `api/` folder MUST remain at the root of the project to ensure Vercel routes the Python serverless functions correctly.
