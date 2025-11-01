// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import { dirname } from "path";

import { normalizePath, TFile, TFolder, type App } from "obsidian";
import { getDistFilePath } from "./get-dist";

/**
 * option for function moveFileAndInlinks
 */
export interface IMoveFileToAstroOpt {
	/**
	 * obsidian app instance
	 */
	app: App;

	/**
	 * when the dist folder has same file, how to deal with it
	 *
	 * true: skip
	 * false: replace
	 *
	 * @default true
	 */
	skipFileWhenExist?: boolean;
}

export interface ImoveObFileResult {
	/** is moved to dist */
	moved?: boolean;
	/** is not moved to dist */
	skiped?: boolean;
	/** is moved and replace dist file */
	replaced?: boolean;

	/**
	 * inlink files in the ob file
	 */
	inlinkFiles?: Set<TFile>;
}

/**
 * move obsidian file to distFolder(only file，not include relative files)
 * @param file obsidian file
 * @param distFolder destination folder path in the vault, relative to the vault root, for example: "folder/subfolder"
 */
export async function moveObFile(
	file: TFile,
	distFolder: string,
	opt: IMoveFileToAstroOpt,
): Promise<ImoveObFileResult> {
	const { app, skipFileWhenExist = true } = opt;

	// find file inlinks
	const fileCache = app.metadataCache.getFileCache(file);

	const inlinkFiles = new Set<TFile>();
	if (fileCache?.links) {
		for (const link of fileCache.links) {
			// get link file
			const inlinkFile = app.metadataCache.getFirstLinkpathDest(
				link.link,
				file.path,
			);

			if (inlinkFile) {
				inlinkFiles.add(inlinkFile);
			}
		}
	}



	if (fileCache?.embeds) {
		for (const embed of fileCache.embeds) {
			// get embed file
			const inlinkFile = app.metadataCache.getFirstLinkpathDest(
				embed.link,
				file.path,
			);

			if (inlinkFile) {
				inlinkFiles.add(inlinkFile);
			}
		}
	}

	const distPath = getDistFilePath(file, distFolder);
	const realDistFolder = dirname(distPath);

	// folder is exist
	if (!isFolderExist(realDistFolder, app)) {
		await app.vault.adapter.mkdir(normalizePath(realDistFolder));
	}

	// use node fs api to judge whether the file exists
	const isExist = isFileExist(distPath, app);
	if (isExist && skipFileWhenExist) {
		return { skiped: true };
	}

	// move file
	await app.fileManager.renameFile(file, distPath);

	return {
		moved: true,
		replaced: isExist,

		inlinkFiles,
	};
}

/**
 * check whether the folder is exist
 * @param folderPath folder path, relative to the vault root, for example: "folder/subfolder"
 * @param app obsidian app instance
 */
function isFolderExist(folderPath: string, app: App): boolean {
	const vault = app.vault;
	const folder = vault.getAbstractFileByPath(folderPath);

	if (!folder) {
		return false;
	}

	// 检查文件夹是否存在并且是一个文件夹
	return folder instanceof TFolder;
}

function isFileExist(filePath: string, app: App): boolean {
	const vault = app.vault;
	const file = vault.getAbstractFileByPath(filePath);

	if (!file) {
		return false;
	}

	// 检查文件是否存在并且是一个文件
	return file instanceof TFile;
}
