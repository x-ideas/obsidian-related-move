export default {
	tabWidth: 2,
	useTabs: true,
	semi: true,
	printWidth: 80,
	singleQuote: true,
	trailingComma: 'all',
	arrowParens: 'always',
	plugins: ['prettier-plugin-svelte'],
	overrides: [
		{
			files: '*.svelte',
			options: {
				parser: 'svelte',
			},
		},
	],
};
