# FinanceOS 💸

> An effortless personal money diary & financial OS focused on students and young adults managing a monthly budget.

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Dexie (IndexedDB)** for local-first zero-latency storage.

---

## 🌟 Core Philosophy

Traditional finance apps treat all outgoing payments as personal spending. **FinanceOS solves this**:
- **Personal Spending**: Money actually consumed (deducts from monthly budget).
- **Friend Splits**: When you pay ₹200 for food (₹100 your share, ₹100 friend share), personal spending only increases by ₹100, and friend owes ₹100.
- **Lending**: Direct loans are tracked as receivables and deducted from cash, but **never** count as personal spending.
- **Reimbursements**: Money received back settles receivables and replenishes cash without being misclassified as income.
- **Loan Repayments**: Restores cash and reduces loan balances with partial repayment validation.

---

## ✨ Features

- ⚡ **<10-Second Flow**: Tap `+ SPENT` → Enter Amount → Select Category → Save.
- 🎨 **Adaptive Inverted Themes**:
  - **Light Mode**: Offwhite canvas with sleek black/charcoal gradient cards.
  - **Dark Mode**: Black/obsidian gradient canvas with crisp offwhite cards.
- 📊 **Segmented Pill Donut Chart**: Visual spending breakdown with total spent centered.
- 💳 **FinanceOS Wallet Card**: Physical cash & account balances (UPI, Bank, Cash).
- 🏷️ **Barcode Tick Gauge**: Visual spending meter for monthly budget and daily pace.
- 💬 **Natural Language Input**: Type `"Spent 50 on food"` or `"Paid 200 for food, 100 was Karthick's"`.
- 🔍 **"Where Did My Money Go?"**: 1-tap plain-English financial story.
- 💾 **Local-First & Isolated Profiles**: IndexedDB persistence with profile switcher.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/crsajid7/FinanceOS.git

# Navigate into directory
cd FinanceOS

# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build
```

---

## 🧪 Tests

Includes comprehensive unit tests for accounting engine mathematical rules and natural language parser:

```bash
npm test
```

---

## 📄 License
MIT
