import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility';
import eslintConfigPrettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['**/*.{mjs,js}', '**/.nuxt/', '**/.output/', 'apps/*/public/', 'types/storyblok-generated.ts'],
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
  },
  ...pluginVue.configs['flat/recommended'],
  ...pluginVueA11y.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/unified-signatures': 'off',
      'no-restricted-imports': [
        'error',
        { name: '#build/imports', message: 'Please use #imports instead.' },
        { name: '#build/components', message: 'Please use #components instead.' },
        { name: '#build/app', message: 'Please use #app instead.' },
        {
          name: 'process',
          importNames: ['ref', 'emit', 'watch', 'nextTick'],
          message: "Please make sure that you didn't accidentally import from 'process' instead of 'vue'.",
        },
        {
          name: 'fs',
          importNames: ['ref', 'emit', 'watch', 'nextTick'],
          message: "Please make sure that you didn't accidentally import from 'process' instead of 'vue'.",
        },
        {
          name: 'node:fs',
          importNames: ['ref', 'emit', 'watch', 'nextTick'],
          message: "Please make sure that you didn't accidentally import from 'process' instead of 'vue'.",
        },
      ],
      'vue/attribute-hyphenation': 'off',
      'vue/html-self-closing': [
        'error',
        {
          html: { void: 'always', normal: 'never', component: 'always' },
          svg: 'always',
          math: 'always',
        },
      ],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/require-typed-ref': 'error',
      'vue/v-on-event-hyphenation': ['error', 'never'],
      'vue/valid-template-root': 'off',
      'vue/no-undef-components': ['error', { ignorePatterns: ['ClientOnly', 'model-viewer'] }],
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
      'vuejs-accessibility/no-static-element-interactions': ['off'],
    },
  },
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: tseslint.parser } } },
];
