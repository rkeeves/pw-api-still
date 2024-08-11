export default {
  root: true,
  parser: '@typescript-eslint/parser',
  files: ['**/*.ts', '**/*.tsx'],
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
};
