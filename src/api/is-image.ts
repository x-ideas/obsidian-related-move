import type { TFile } from 'obsidian';

export function isImageFile(file: TFile): boolean {
	return (
		file.extension === 'png' ||
		file.extension === 'jpg' ||
		file.extension === 'jpeg' ||
		file.extension === 'gif' ||
		file.extension === 'svg' ||
		file.extension === 'webp' ||
		file.extension === 'bmp' ||
		file.extension === 'excalidraw'
	);
}
