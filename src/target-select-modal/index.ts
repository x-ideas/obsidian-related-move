import { type App, SuggestModal, TFolder } from 'obsidian';
import { getI18nInst } from '../configs/i18n';

export class FolderSuggestModal extends SuggestModal<string> {
	private folders: TFolder[];
	private onSelect: (folder: string) => void;

	constructor(app: App, onSelect: (folder: string) => void) {
		super(app);

		const i18n = getI18nInst();
		this.setPlaceholder(i18n.t('Choose a Target Folder'));
		this.setInstructions([
			{ command: '↑↓', purpose: i18n.t('Navigate') },
			{ command: '↵', purpose: i18n.t('Choose') },
			{ command: 'Esc', purpose: i18n.t('Cancel') },
		]);

		this.onSelect = onSelect;

		this.folders = [];

		// 获取所有文件夹
		for (const file of app.vault.getAllLoadedFiles()) {
			if (file instanceof TFolder) {
				this.folders.push(file);
			}
		}
	}

	getSuggestions(query: string) {
		return this.folders
			.filter((folder) => folder.path.includes(query))
			.map((folder) => folder.path);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	onChooseSuggestion(item: string, _evt: MouseEvent | KeyboardEvent): void {
		this.close();
		this.onSelect(item);
	}
}
