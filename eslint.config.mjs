import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["src/**/*.ts"],
        languageOptions: { globals: globals.node },
        rules: {
            // Enfore `===`
            eqeqeq: ["error", "smart"],
        },
    },
    tseslint.configs.recommended,
]);
