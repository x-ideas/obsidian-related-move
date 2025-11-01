import type { TFile } from 'obsidian';
import { isImageFile } from './is-image';

export function getDistFilePath(file: TFile, folder: string) {
	if (isImageFile(file)) {
		return `${getDistFolderForImage(folder)}/${file.name}`;
	}

	// if (file.extension === 'md') {
	//   return `${getDistFolderForMarkdown(folder)}/${file.basename}.md`;
	// }

	return `${folder}/${file.name}`;
}

function getDistFolderForImage(folder: string) {
	return `${folder}/assets/`;
}

// function getDistFolderForMarkdown(folder: string) {
//   return `${folder}`;
// }
