export default {
  '*.md': ['oxfmt'],
  '*.{json,jsonc}': ['oxfmt'],
  '*.{ts,js,cjs,mjs,tsx}': ['oxlint', 'oxfmt', () => 'tsc --noEmit'],
};
