import { type App, Modal, TFile } from "obsidian";
import { getI18nInst } from "../configs/i18n.js";
import type { IFileMoveInfo } from "../api/move-files.js";
import "./styles.css";

export class RelatedMoveConfirmModal extends Modal {
	private fileInfos: IFileMoveInfo[];
	private selectedFiles: Set<TFile>;
	private onConfirm: (selectedFiles: Set<TFile> | null) => void;
	private relatedSelectEnabled: boolean = true;
	private cascadeEnabled: boolean = false;

	constructor(
		app: App,
		fileInfos: IFileMoveInfo[],
		onConfirm: (selectedFiles: Set<TFile> | null) => void,
	) {
		super(app);
		this.fileInfos = fileInfos;

		console.log("fileInfos", fileInfos);

		// By default, select all files with backlinks.length <= 1
		// Files with backlinks.length > 1 need user confirmation
		this.selectedFiles = new Set(
			fileInfos
				.filter((info) => info.backlinks.length <= 1)
				.map((info) => info.file),
		);
		this.onConfirm = onConfirm;
	}


	onOpen() {
		const { contentEl } = this;
		const i18n = getI18nInst();
		contentEl.empty();

		// Title
		contentEl.createEl("h2", {
			text: i18n.t("Related Move Files"),
		});

		// Description
		contentEl.createEl("p", {
			text: i18n.t(
				"Files to be moved. Please review and select files with multiple references.",
			),
		});

		// Related select checkbox

		const selectContainer = contentEl.createEl("div", {
			cls: "related-move-modal-select-container",
		});

		const relatedSelectContainer = selectContainer.createEl("div", {
			cls: "related-move-modal-related-select",
		});
		const relatedSelectCheckbox = relatedSelectContainer.createEl("input", {
			type: "checkbox",
			cls: "related-move-modal-checkbox",
		}) as HTMLInputElement;
		relatedSelectCheckbox.id = "related-select-checkbox";
		relatedSelectContainer.createEl("label", {
			text: i18n.t("Related Select"),
			attr: { for: "related-select-checkbox" },
		});
		relatedSelectCheckbox.checked = this.relatedSelectEnabled;
		relatedSelectCheckbox.onchange = (e) => {
			this.relatedSelectEnabled = (e.target as HTMLInputElement).checked;

			if (!this.relatedSelectEnabled) {
				this.cascadeEnabled = false;
				cascadeCheckbox.checked = false;
			}
		};

		// Cascade checkbox
		const cascadeContainer = selectContainer.createEl("div", {
			cls: "related-move-modal-related-select",
		});
		const cascadeCheckbox = cascadeContainer.createEl("input", {
			type: "checkbox",
			cls: "related-move-modal-checkbox",
		}) as HTMLInputElement;
		cascadeCheckbox.id = "cascade-checkbox";
		cascadeContainer.createEl("label", {
			text: i18n.t("Cascade"),
			attr: { for: "cascade-checkbox" },
		});
		cascadeCheckbox.checked = this.cascadeEnabled;
		cascadeCheckbox.onchange = (e) => {
			this.cascadeEnabled = (e.target as HTMLInputElement).checked;

			if (this.cascadeEnabled) {
				this.relatedSelectEnabled = true;
				relatedSelectCheckbox.checked = true;
			}
		};

		// Table container with scroll
		const tableContainer = contentEl.createEl("div", {
			cls: "related-move-modal-container",
		});

		// Create table
		const table = tableContainer.createEl("table", {
			cls: "related-move-modal-table",
		});

		// Table header
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr", {
			cls: "related-move-modal-table-header-row",
		});

		headerRow.createEl("th", {
			cls: "related-move-modal-table-header-cell related-move-modal-table-header-cell-checkbox",
		});

		 headerRow.createEl("th", {
			text: i18n.t("File Name"),
			cls: "related-move-modal-table-header-cell",
		});

		headerRow.createEl("th", {
			text: i18n.t("Reference Info"),
			cls: "related-move-modal-table-header-cell related-move-modal-table-header-cell-ref-info",
		});

		headerRow.createEl("th", {
			text: i18n.t("Referenced By"),
			cls: "related-move-modal-table-header-cell",
		});

		// Table body
		const tbody = table.createEl("tbody");

		// Render each file as a table row
		for (const fileInfo of this.fileInfos) {
			const refCount = fileInfo.backlinks.length;
			const rowClasses = ["related-move-modal-table-row"];
			if (refCount > 1) {
				rowClasses.push("related-move-modal-table-row-warning");
			}
			const row = tbody.createEl("tr", {
				cls: rowClasses.join(" "),
			});

			// Checkbox cell
			const checkboxCell = row.createEl("td", {
				cls: "related-move-modal-table-cell",
			});
			const checkbox = checkboxCell.createEl("input", {
				type: "checkbox",
				cls: "related-move-modal-checkbox",
				attr: { "data-file-path": fileInfo.file.path },
			}) as HTMLInputElement;
			checkbox.checked = this.selectedFiles.has(fileInfo.file);
			checkbox.onchange = (e) => {
				const target = e.target as HTMLInputElement;
				const isChecked = target.checked;
				let needsUpdate = false;

				if (this.cascadeEnabled) {
					// When cascade is enabled, select/deselect all files referenced by this file (including indirect)
					if (isChecked) {
						// Select the file and all files it references (including indirect)
						this.selectedFiles.add(fileInfo.file);
						for (const refFile of fileInfo.allLinks) {
							this.selectedFiles.add(refFile);
						}
					} else {
						// Deselect the file and all files it references (including indirect)
						this.selectedFiles.delete(fileInfo.file);
						for (const refFile of fileInfo.allLinks) {
							this.selectedFiles.delete(refFile);
						}
					}
					needsUpdate = true;
				} else if (this.relatedSelectEnabled) {
					// When related select is enabled, select/deselect only direct referenced files
					if (isChecked) {
						// Select the file and files it directly references
						this.selectedFiles.add(fileInfo.file);
						for (const refFile of fileInfo.links) {
							this.selectedFiles.add(refFile);
						}
					} else {
						// Deselect the file and files it directly references
						this.selectedFiles.delete(fileInfo.file);
						for (const refFile of fileInfo.links) {
							this.selectedFiles.delete(refFile);
						}

					}
					needsUpdate = true;
				} else {
					// Normal mode: independent selection
					if (isChecked) {
						this.selectedFiles.add(fileInfo.file);
					} else {
						this.selectedFiles.delete(fileInfo.file);
					}
				}

				// Update all checkboxes to reflect the changes if needed
				if (needsUpdate) {
					tableContainer
						.querySelectorAll<HTMLInputElement>("input[type='checkbox'][data-file-path]")
						.forEach((cb: HTMLInputElement) => {
							const filePath = cb.dataset.filePath;
							if (filePath) {
								const file = this.fileInfos.find((info) => info.file.path === filePath);
								if (file) {
									cb.checked = this.selectedFiles.has(file.file);
								}
							}
						});
				}
				updateStats();
			};

			// File name cell
			const fileNameCell = row.createEl("td", {
				cls: "related-move-modal-table-cell",
			});
			const fileNameLink = fileNameCell.createEl("a", {
				text: fileInfo.file.name,
				href: fileInfo.file.path,
				cls: "related-move-modal-file-link",
			});
			fileNameLink.onClickEvent(async (e) => {
				e.preventDefault();
				await this.app.workspace.openLinkText(
					fileInfo.file.path,
					fileInfo.file.path,
					true, // newLeaf - open in new tab
				);
			});

			// Reference info cell
			const refInfoCellClasses = [
				"related-move-modal-table-cell",
				"related-move-modal-ref-info",
			];
			if (refCount === 0) {
				refInfoCellClasses.push("related-move-modal-ref-info-root");
			} else if (refCount > 1) {
				refInfoCellClasses.push("related-move-modal-ref-info-warning");
			}
			const refInfoCell = row.createEl("td", {
				cls: refInfoCellClasses.join(" "),
			});

			if (refCount === 0) {
				refInfoCell.textContent = i18n.t("Root file");
			} else if (refCount === 1) {
				refInfoCell.textContent = i18n
					.t("Referenced by 1 file")
					.replace("{count}", String(refCount));
			} else {
				refInfoCell.textContent = i18n
					.t("Referenced by count files - Needs confirmation")
					.replace("{count}", String(refCount));
			}

			// Referenced files cell
			const refFilesCell = row.createEl("td", {
				cls: "related-move-modal-table-cell related-move-modal-ref-files",
			});

			if (refCount === 0) {
				refFilesCell.textContent = "-";
			} else if (refCount === 1) {
				// Don't show referenced files when count is 1
				refFilesCell.textContent = "-";
			} else {
				// Show list when count >= 2
				const refFilesList = refFilesCell.createEl("ul", {
					cls: "related-move-modal-ref-files-list",
				});

				fileInfo.backlinks.forEach((refFile) => {
					const listItem = refFilesList.createEl("li", {
						cls: "related-move-modal-ref-files-list-item",
					});
					const refLink = listItem.createEl("a", {
						text: refFile.name,
						href: refFile.path,
						cls: "related-move-modal-ref-link",
					});
					refLink.onClickEvent(async (e) => {
						e.preventDefault();
						await this.app.workspace.openLinkText(
							refFile.path,
							refFile.path,
							true, // newLeaf - open in new tab
						);
					});
				});
			}
		}

		// Statistics
		const statsDiv = contentEl.createEl("div", {
			cls: "related-move-modal-stats",
		});

		const updateStats = () => {
		const totalFiles = this.fileInfos.length;
		const selectedCount = this.selectedFiles.size;
		const needsConfirmation = this.fileInfos.filter(
			(info) => info.backlinks.length > 1,
		).length;

			statsDiv.textContent = i18n
				.t("Total: total files, Selected: selected files, Needs confirmation: confirmation files")
				.replace("{total}", String(totalFiles))
				.replace("{selected}", String(selectedCount))
				.replace("{confirmation}", String(needsConfirmation));
		};

		updateStats();

		// Buttons
		const buttonContainer = contentEl.createEl("div", {
			cls: "modal-button-container related-move-modal-button-container",
		});

		const selectAllButton = buttonContainer.createEl("button", {
			text: i18n.t("Select All"),
		});
		selectAllButton.onClickEvent(() => {
			this.selectedFiles = new Set(this.fileInfos.map((info) => info.file));
			// Update all checkboxes
			tableContainer
				.querySelectorAll<HTMLInputElement>("input[type='checkbox']")
				.forEach((checkbox: HTMLInputElement) => {
					checkbox.checked = true;
				});
			updateStats();
		});

		const deselectAllButton = buttonContainer.createEl("button", {
			text: i18n.t("Deselect All"),
		});
		deselectAllButton.onClickEvent(() => {
			this.selectedFiles.clear();
			// Update all checkboxes
			tableContainer
				.querySelectorAll<HTMLInputElement>("input[type='checkbox']")
				.forEach((checkbox: HTMLInputElement) => {
					checkbox.checked = false;
				});
			updateStats();
		});

		const confirmButton = buttonContainer.createEl("button", {
			text: i18n.t("Confirm"),
			cls: "mod-cta",
		});
		confirmButton.onClickEvent(() => {
			this.close();
			this.onConfirm(this.selectedFiles);
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: i18n.t("Cancel"),
		});
		cancelButton.onClickEvent(() => {
			this.close();
			this.onConfirm(null);
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
