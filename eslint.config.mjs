import oxlint from 'eslint-plugin-oxlint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { configs as tsConfigs } from 'typescript-eslint';

export default [
	...tsConfigs.recommended,
	...oxlint.configs['flat/recommended'], // oxlint should be the last one
	eslintPluginPrettierRecommended,
	{
		ignores: ['dist'],
	},
];
