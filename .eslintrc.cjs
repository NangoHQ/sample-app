module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/strict',
    'plugin:@typescript-eslint/stylistic',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  root: true,
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true,
      jsx: true,
    },
    project: './tsconfig.json',
  },

  rules: {
    'prettier/prettier': [
      'error',
      {
        arrowParens: 'always',
        bracketSpacing: true,
        bracketSameLine: false,
        printWidth: 80,
        singleQuote: true,
        trailingComma: 'es5',
        useTabs: false,
        quoteProps: 'as-needed',
      },
    ],
    '@typescript-eslint/adjacent-overload-signatures': ['error'],
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    '@typescript-eslint/ban-types': ['error'],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' },
    ],
    '@typescript-eslint/member-ordering': ['error'],
    '@typescript-eslint/no-empty-interface': ['error'],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        vars: 'all',
        args: 'after-used',
      },
    ],
    '@typescript-eslint/comma-spacing': ['error'],
    '@typescript-eslint/func-call-spacing': ['error'],
    '@typescript-eslint/no-confusing-non-null-assertion': ['error'],
    '@typescript-eslint/no-extra-non-null-assertion': ['error'],
    '@typescript-eslint/no-non-null-asserted-optional-chain': ['error'],
    '@typescript-eslint/no-unnecessary-type-constraint': ['error'],
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    '@typescript-eslint/no-useless-constructor': ['error'],
    '@typescript-eslint/no-var-requires': ['error'],
    '@typescript-eslint/prefer-enum-initializers': ['error'],
    '@typescript-eslint/prefer-function-type': ['error'],
    '@typescript-eslint/prefer-literal-enum-member': ['error'],
    '@typescript-eslint/prefer-namespace-keyword': ['error'],
    '@typescript-eslint/prefer-optional-chain': ['off'],
    '@typescript-eslint/prefer-ts-expect-error': ['error'],
    '@typescript-eslint/type-annotation-spacing': ['error'],
    '@typescript-eslint/unified-signatures': ['error'],
    '@typescript-eslint/no-redeclare': ['error'],
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/no-loss-of-precision': 'error',
    '@typescript-eslint/ban-tslint-comment': ['error'],
    '@typescript-eslint/consistent-generic-constructors': 'error',
    '@typescript-eslint/no-duplicate-enum-values': 'error',
    '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
    '@typescript-eslint/no-unsafe-declaration-merging': 'error',

    // To decide
    '@typescript-eslint/no-for-in-array': ['off'],
    '@typescript-eslint/prefer-for-of': ['warn'],
    '@typescript-eslint/no-explicit-any': ['off'], // a lof of error
    '@typescript-eslint/no-unsafe-assignment': ['off'], // a lot of error
    '@typescript-eslint/no-unsafe-argument': ['off'], // a lot of error

    // Disabled On purpose
    '@typescript-eslint/ban-ts-comment': ['off'],
    '@typescript-eslint/consistent-type-definitions': ['off'], // unecessary
    '@typescript-eslint/no-dynamic-delete': ['off'], // to complicated for the small benefits
    '@typescript-eslint/no-extraneous-class': ['off'],
    '@typescript-eslint/no-implicit-any-catch': ['off'], // to complicated for the small benefits
    '@typescript-eslint/no-inferrable-types': ['off'],
    '@typescript-eslint/no-invalid-void-type': ['off'], // needs to return undefined
    '@typescript-eslint/no-non-null-assertion': ['off'],
    '@typescript-eslint/no-parameter-properties': ['off'],
    '@typescript-eslint/no-require-imports': ['off'],
    '@typescript-eslint/no-this-alias': ['off'], // to complicated for the small benefits
    '@typescript-eslint/no-type-alias': ['off'],

    // Disabled => Require slow parser. Requires parserOptions.project above to enable them
    '@typescript-eslint/dot-notation': ['off'],
    '@typescript-eslint/no-base-to-string': ['off'],

    'react/prop-types': ['off'],
    'import/no-unresolved': 'off', // checked by ts

    'import/extensions': [
      'error',
      'always',
      {
        json: 'always',
        js: 'always',
        ts: 'never',
        ignorePackages: true,
      },
    ],
    'import/order': ['error'],
    '@typescript-eslint/unbound-method': 'off',

    '@typescript-eslint/no-misused-promises': [
      'warn',
      {
        checksVoidReturn: {
          arguments: false,
          attributes: false,
        },
      },
    ],
  },
};
