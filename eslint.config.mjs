import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";


export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.browser } },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "eqeqeq": ["error", "always"],
      "curly": "error",
      "no-console": "off",
      "semi": ["error", "always"],
      "quotes": ["error", "double"],
      "indent": ["error", 2],
      "no-var": "error",
      "prefer-const": "error",
      "comma-dangle": ["error", "always-multiline"],
      "brace-style": ["error", "1tbs", { allowSingleLine: true }],
    },
  },
]);
