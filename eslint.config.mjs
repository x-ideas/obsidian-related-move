import oxlint from 'eslint-plugin-oxlint';
import prettier from 'eslint-plugin-prettier/recommended';
import { configs as tsConfigs } from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteConfig from './svelte.config.js';

export default [
	...tsConfigs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	...oxlint.configs['flat/recommended'], // oxlint should be the last one
	{
		ignores: ['dist'],
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig,
			},
		},
	},
];
