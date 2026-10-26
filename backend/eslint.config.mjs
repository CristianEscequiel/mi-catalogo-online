// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'src/database/migrations/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'prettier/prettier': ['error' , { endOfLine: 'auto' }],
    },
  },
  {
    // Los consumidores dependen del puerto (MailSender, ImageStorage, AiContentGenerator), no del adaptador.
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/mail.service', '**/file-storage.service', '**/openai.service'],
              message:
                'Importa el puerto (mail-sender.port, image-storage.port, ai-content-generator.port), no el adaptador.',
            },
          ],
        },
      ],
    },
  },
  {
    // Solo el módulo del adaptador y su spec pueden importarlo.
    files: [
      'src/mail/mail.module.ts',
      'src/files/files.module.ts',
      'src/ai/ai.module.ts',
      '**/*.spec.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
);
