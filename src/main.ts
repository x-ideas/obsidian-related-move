import { MarkdownView, Notice, Plugin, TFile, TFolder } from 'obsidian';
import { moveFileAndInlinks } from './api/move-files';
import { getI18nInst } from './configs/i18n';
import { FolderSuggestModal } from './target-select-modal';

export default class Main extends Plugin {
	async onload() {
		const name = getI18nInst().t('Related Move');

		this.registerEvent(
			// add file context menu
			this.app.workspace.on('file-menu', (menu, file) => {
				// exclude folder
				if (file instanceof TFolder) {
					return;
				}

				menu.addItem((item) => {
					item.setIcon('circle-arrow-right');
					item.setTitle(name);
					item.onClick(async () => {
						// if file is TFile
						if (file instanceof TFile) {
							await this.syncFile(file);
							return;
						}
					});
				});
			}),
		);

		// add editor context menu
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, _editor, view) => {
				menu.addItem((item) => {
					item.setIcon('circle-arrow-right');
					item.setTitle(name);
					item.onClick(async () => {
						// gei current file
						const file = view.file;
						if (file instanceof TFile) {
							await this.syncFile(file);
							return;
						}
					});
				});
			}),
		);

		// add command
		this.addCommand({
			id: 'circle-arrow-right',
			name: name,
			callback: async () => {
				await this.syncCurrentFile();
			},
		});
	}

	onunload() {}

	syncFile = async (file: TFile) => {
		new FolderSuggestModal(this.app, async (folder) => {
			try {
				const statRes = await moveFileAndInlinks(file, folder, {
					app: this.app,
					skipFileWhenExist: true,
					includeInlinks: true,
				});

				new Notice(
					`Moved: ${statRes.movedCount}, Skiped: ${statRes.skipedCount}, Replaced: ${statRes.replacedCount}`,
				);
			} catch (error) {
				console.error(error);
				new Notice(`Error: ${error.message}`);
			}
		}).open();
	};

	syncCurrentFile = async () => {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			return;
		}
		const file = activeView.file;
		if (!file) {
			new Notice('No active file');
			return;
		}

		await this.syncFile(file);
	};
}
