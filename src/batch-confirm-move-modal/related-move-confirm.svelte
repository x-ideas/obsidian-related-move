<script lang="ts">
	import type { App } from 'obsidian';
	import type { TFile } from 'obsidian';
	import { getI18nInst } from '../configs/i18n';
	import type { IFileMoveInfo } from '../api/move-files';

	interface Props {
		app: App;
		fileInfos: IFileMoveInfo[];
		initialSelectedFiles: Set<TFile>;
		onConfirm: (selectedFiles: Set<TFile> | null) => void;
		onCancel: () => void;
	}

	let { app, fileInfos, initialSelectedFiles, onConfirm, onCancel }: Props =
		$props();

	const i18n = getI18nInst();

	let selectedFiles = $state(new Set(initialSelectedFiles));
	let relatedSelectEnabled = $state(true);
	let cascadeEnabled = $state(false);

	function handleRelatedSelectChange(checked: boolean) {
		relatedSelectEnabled = checked;
		if (!checked) {
			cascadeEnabled = false;
		}
	}

	function handleCascadeChange(checked: boolean) {
		cascadeEnabled = checked;
		if (checked) {
			relatedSelectEnabled = true;
		}
	}

	function handleFileCheckboxChange(
		fileInfo: IFileMoveInfo,
		isChecked: boolean,
	) {
		// Create a new Set to trigger Svelte reactivity
		const newSelectedFiles = new Set(selectedFiles);

		if (cascadeEnabled) {
			// When cascade is enabled, select/deselect all files referenced by this file (including indirect)
			if (isChecked) {
				newSelectedFiles.add(fileInfo.file);
				for (const refFile of fileInfo.allLinks) {
					newSelectedFiles.add(refFile);
				}
			} else {
				newSelectedFiles.delete(fileInfo.file);
				for (const refFile of fileInfo.allLinks) {
					newSelectedFiles.delete(refFile);
				}
			}
		} else if (relatedSelectEnabled) {
			// When related select is enabled, select/deselect only direct referenced files
			if (isChecked) {
				newSelectedFiles.add(fileInfo.file);
				for (const refFile of fileInfo.links) {
					newSelectedFiles.add(refFile);
				}
			} else {
				newSelectedFiles.delete(fileInfo.file);
				for (const refFile of fileInfo.links) {
					newSelectedFiles.delete(refFile);
				}
			}
		} else {
			// Normal mode: independent selection
			if (isChecked) {
				newSelectedFiles.add(fileInfo.file);
			} else {
				newSelectedFiles.delete(fileInfo.file);
			}
		}

		// Assign new Set to trigger reactivity
		selectedFiles = newSelectedFiles;
	}

	function handleSelectAll() {
		selectedFiles = new Set(fileInfos.map((info) => info.file));
	}

	function handleDeselectAll() {
		selectedFiles.clear();
	}

	function handleConfirm() {
		onConfirm(selectedFiles);
	}

	function handleCancel() {
		onConfirm(null);
		onCancel();
	}

	async function openFile(filePath: string) {
		await app.workspace.openLinkText(filePath, filePath, true);
	}

	function getRefInfoText(refCount: number): string {
		if (refCount === 0) {
			return i18n.t('Root file');
		} else if (refCount === 1) {
			return i18n
				.t('Referenced by 1 file')
				.replace('{count}', String(refCount));
		} else {
			return i18n
				.t('Referenced by count files - Needs confirmation')
				.replace('{count}', String(refCount));
		}
	}

	const totalFiles = $derived(fileInfos.length);
	const selectedCount = $derived(selectedFiles.size);
	const needsConfirmation = $derived(
		fileInfos.filter((info) => info.backlinks.length > 1).length,
	);

	const statsText = $derived(
		i18n
			.t(
				'Total: total files, Selected: selected files, Needs confirmation: confirmation files',
			)
			.replace('{total}', String(totalFiles))
			.replace('{selected}', String(selectedCount))
			.replace('{confirmation}', String(needsConfirmation)),
	);
</script>

<h2>{i18n.t('Related Move Files')}</h2>

<p>
	{i18n.t(
		'Files to be moved. Please review and select files with multiple references.',
	)}
</p>

<div class="related-move-modal-select-container">
	<div class="related-move-modal-related-select">
		<input
			type="checkbox"
			id="related-select-checkbox"
			class="related-move-modal-checkbox"
			checked={relatedSelectEnabled}
			onchange={(e) =>
				handleRelatedSelectChange((e.target as HTMLInputElement).checked)}
		/>
		<label for="related-select-checkbox">{i18n.t('Related Select')}</label>
	</div>

	<div class="related-move-modal-related-select">
		<input
			type="checkbox"
			id="cascade-checkbox"
			class="related-move-modal-checkbox"
			checked={cascadeEnabled}
			onchange={(e) =>
				handleCascadeChange((e.target as HTMLInputElement).checked)}
		/>
		<label for="cascade-checkbox">{i18n.t('Cascade')}</label>
	</div>
</div>

<div class="related-move-modal-container">
	<table class="related-move-modal-table">
		<thead>
			<tr class="related-move-modal-table-header-row">
				<th
					class="related-move-modal-table-header-cell related-move-modal-table-header-cell-checkbox"
				></th>
				<th class="related-move-modal-table-header-cell">
					{i18n.t('File Name')}
				</th>
				<th
					class="related-move-modal-table-header-cell related-move-modal-table-header-cell-ref-info"
				>
					{i18n.t('Reference Info')}
				</th>
				<th class="related-move-modal-table-header-cell">
					{i18n.t('Referenced By')}
				</th>
			</tr>
		</thead>
		<tbody>
			{#each fileInfos as fileInfo (fileInfo.file.path)}
				{@const refCount = fileInfo.backlinks.length}
				{@const rowWarning = refCount > 1}
				<tr
					class="related-move-modal-table-row"
					class:related-move-modal-table-row-warning={rowWarning}
				>
					<td class="related-move-modal-table-cell">
						<input
							type="checkbox"
							class="related-move-modal-checkbox"
							checked={selectedFiles.has(fileInfo.file)}
							onchange={(e) =>
								handleFileCheckboxChange(
									fileInfo,
									(e.target as HTMLInputElement).checked,
								)}
						/>
					</td>
					<td class="related-move-modal-table-cell">
						<a
							href={fileInfo.file.path}
							class="related-move-modal-file-link"
							onclick={(e) => {
								e.preventDefault();
								openFile(fileInfo.file.path);
							}}
						>
							{fileInfo.file.name}
						</a>
					</td>
					<td
						class="related-move-modal-table-cell related-move-modal-ref-info"
						class:related-move-modal-ref-info-root={refCount === 0}
						class:related-move-modal-ref-info-warning={refCount > 1}
					>
						{getRefInfoText(refCount)}
					</td>
					<td
						class="related-move-modal-table-cell related-move-modal-ref-files"
					>
						{#if refCount === 0 || refCount === 1}
							-
						{:else}
							<ul class="related-move-modal-ref-files-list">
								{#each fileInfo.backlinks as refFile (refFile.path)}
									<li class="related-move-modal-ref-files-list-item">
										<a
											href={refFile.path}
											class="related-move-modal-ref-link"
											onclick={(e) => {
												e.preventDefault();
												openFile(refFile.path);
											}}
										>
											{refFile.name}
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<div class="related-move-modal-stats">{statsText}</div>

<div class="modal-button-container related-move-modal-button-container">
	<button onclick={handleSelectAll}>{i18n.t('Select All')}</button>
	<button onclick={handleDeselectAll}>{i18n.t('Deselect All')}</button>
	<button class="mod-cta" onclick={handleConfirm}>{i18n.t('Confirm')}</button>
	<button onclick={handleCancel}>{i18n.t('Cancel')}</button>
</div>

<style>
	/* Related Move Modal - Container */
	.related-move-modal-container {
		max-height: 400px;
		overflow-y: auto;
		margin-top: 1em;
		margin-bottom: 1em;
	}

	/* Related Move Modal - Table */
	.related-move-modal-table {
		width: 100%;
		border-collapse: collapse;
	}

	/* Related Move Modal - Table Header Row */
	.related-move-modal-table-header-row {
		border-bottom: 2px solid var(--background-modifier-border);
	}

	/* Related Move Modal - Table Header Cell */
	.related-move-modal-table-header-cell {
		padding: 0.5em;
		text-align: left;
	}

	.related-move-modal-table-header-cell-checkbox {
		width: 40px;
	}

	.related-move-modal-table-header-cell-ref-info {
		width: 200px;
	}

	/* Related Move Modal - Table Row */
	.related-move-modal-table-row {
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.related-move-modal-table-row-warning {
		background-color: var(--background-modifier-hover);
	}

	/* Related Move Modal - Table Cell */
	.related-move-modal-table-cell {
		padding: 0.5em;
		vertical-align: top;
	}

	/* Related Move Modal - Checkbox */
	.related-move-modal-checkbox {
		margin-top: 0.25em;
	}

	/* Related Move Modal - File Link */
	.related-move-modal-file-link {
		font-weight: 500;
		cursor: pointer;
		color: var(--link-color);
	}

	/* Related Move Modal - Reference Info */
	.related-move-modal-ref-info {
		font-size: 0.9em;
		color: var(--text-muted);
	}

	.related-move-modal-ref-info-root {
		color: var(--text-normal);
	}

	.related-move-modal-ref-info-warning {
		color: var(--text-warning);
		font-weight: 600;
		padding: 0.25em 0.5em;
		border-radius: 4px;
		display: inline-block;
	}

	/* Related Move Modal - Reference Files */
	.related-move-modal-ref-files {
		font-size: 0.85em;
		color: var(--text-muted);
	}

	/* Related Move Modal - Reference Files List */
	.related-move-modal-ref-files-list {
		margin: 0;
		padding-left: 1.5em;
		list-style-type: disc;
	}

	.related-move-modal-ref-files-list-item {
		margin-bottom: 0.25em;
	}

	/* Related Move Modal - Reference Link */
	.related-move-modal-ref-link {
		cursor: pointer;
		color: var(--link-color);
	}

	/* Related Move Modal - Select Container */
	.related-move-modal-select-container {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	/* Related Move Modal - Related Select */
	.related-move-modal-related-select {
		margin-bottom: 1em;
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.related-move-modal-related-select label {
		cursor: pointer;
		user-select: none;
	}

	/* Related Move Modal - Statistics */
	.related-move-modal-stats {
		margin-top: 1em;
		margin-bottom: 1em;
		padding: 0.5em;
		background-color: var(--background-modifier-border);
		border-radius: 4px;
		font-size: 0.9em;
	}

	/* Related Move Modal - Button Container */
	.related-move-modal-button-container {
		display: flex;
		justify-content: flex-end;
		gap: 0.5em;
		margin-top: 1em;
	}
</style>
