import oxlint from 'eslint-plugin-oxlint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { configs as tsConfigs } from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

export default [
	...tsConfigs.recommended,
	...svelte.configs.recommended,
	...oxlint.configs['flat/recommended'], // oxlint should be the last one
	eslintPluginPrettierRecommended,
	{
		ignores: ['dist'],
	},
];
