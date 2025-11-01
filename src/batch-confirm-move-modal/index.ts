import { type App, Modal, TFile } from 'obsidian';
import { mount, unmount } from 'svelte';
import type { IFileMoveInfo } from '../api/move-files';
import RelatedMoveConfirm from './related-move-confirm.svelte';

interface RelatedMoveConfirmExports {
	destroy?: () => void;
	[key: string]: unknown;
}

export class RelatedMoveConfirmModal extends Modal {
	private fileInfos: IFileMoveInfo[];
	private onConfirm: (selectedFiles: Set<TFile> | null) => void;
	private component: RelatedMoveConfirmExports | null = null;

	constructor(
		app: App,
		fileInfos: IFileMoveInfo[],
		onConfirm: (selectedFiles: Set<TFile> | null) => void,
	) {
		super(app);
		this.fileInfos = fileInfos;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;

		// By default, select all files with backlinks.length <= 1
		// Files with backlinks.length > 1 need user confirmation
		const initialSelectedFiles = new Set(
			this.fileInfos
				.filter((info) => info.backlinks.length <= 1)
				.map((info) => info.file),
		);

		const handleConfirm = (selectedFiles: Set<TFile> | null) => {
			this.close();
			this.onConfirm(selectedFiles);
		};

		const handleCancel = () => {
			this.close();
		};

		this.component = mount(RelatedMoveConfirm, {
			target: contentEl,
			props: {
				app: this.app,
				fileInfos: this.fileInfos,
				initialSelectedFiles,
				onConfirm: handleConfirm,
				onCancel: handleCancel,
			},
		});
	}

	onClose() {
		const { contentEl } = this;

		// Unmount the Svelte component if it exists
		if (this.component) {
			unmount(this.component).catch(() => {
				// If unmount fails, try manual destroy as fallback
				if (typeof this.component?.destroy === 'function') {
					this.component.destroy();
				}
			});
			this.component = null;
		}

		// Empty contentEl will also clean up any remaining DOM
		contentEl.empty();
	}
}
