import en from '../locales/en.json';
import zhCN from '../locales/zh.json';

const i18nResources: Record<string, Record<string, string>> = {
	en: en,
	zh: zhCN,
};

function getTranslation(lang: string): Record<string, string> | undefined {
	return i18nResources[lang];
}

const i18nInst = {
	t(key: string): string {
		const lang = localStorage.getItem('language') || 'en';
		const translate = getTranslation(lang);
		return translate?.[key] || key;
	},
};

export function getI18nInst() {
	return i18nInst;
}
