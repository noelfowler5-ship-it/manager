// Verbatim copy of pm-money's CATEGORIES (index.html) — the join key between
// this app's writes and the sheet's own Type/Month formulas and Budget Plan
// tab. Used here only for server-side validation (a category name that
// isn't in this list is rejected rather than written to the sheet); the
// same list is duplicated again in this repo's index.html for client-side
// parsing/UI, since the client can't import from a Netlify function. Keep
// all three copies (pm-money, index.html, here) in sync.
export const CATEGORIES = [
  { name: "Full-time salary (net)", type: "Income", group: "Income", budget: 1942.95 },
  { name: "Part-time / gig income", type: "Income", group: "Income", budget: 0 },
  { name: "Sewa rumah (own rent)", type: "Expense", group: "Fixed", budget: 250 },
  { name: "Girlfriend's rent help", type: "Expense", group: "Fixed", budget: 0 },
  { name: "Petrol", type: "Expense", group: "Fixed", budget: 150 },
  { name: "Reload (Boost eWallet)", type: "Expense", group: "Fixed", budget: 100 },
  { name: "Utility", type: "Expense", group: "Fixed", budget: 20 },
  { name: "Food (daily)", type: "Expense", group: "Fixed", budget: 300 },
  { name: "Car sinking fund", type: "Expense", group: "Savings", budget: 120 },
  { name: "Emergency Fund Tier 1", type: "Expense", group: "Savings", budget: 150 },
  { name: "Emergency Fund Tier 2 (ASB)", type: "Expense", group: "Savings", budget: 350 },
  { name: "Gold savings for Mom", type: "Expense", group: "Family", budget: 0 },
  { name: "Sunday treat", type: "Expense", group: "Lifestyle", budget: 100 },
  { name: "Dobi (laundry)", type: "Expense", group: "Lifestyle", budget: 44 },
  { name: "Post-jog drinks", type: "Expense", group: "Lifestyle", budget: 91 },
  { name: "PTPTN voluntary payment", type: "Expense", group: "Optional", budget: 0 },
  { name: "Other food", type: "Expense", group: "Lifestyle", budget: 0 },
  { name: "Other / Miscellaneous", type: "Expense", group: "Other", budget: 0 },
];
export const CATEGORY_NAMES = new Set(CATEGORIES.map(c => c.name));
export const catInfo = (name) => CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
