import type { App } from "obsidian";
import { TFile } from "obsidian";
import { type IMoveFileToAstroOpt, moveObFile } from "./move-file";
import { RelatedMoveConfirmModal } from "../batch-confirm-move-modal/index.js";

/**
 * Information about a file to be moved
 */
export interface IFileMoveInfo {
	/** The file to be moved */
	file: TFile;
	/** List of files that reference this file (backlinks in the move set) */
	backlinks: TFile[];
	/** List of files that this file directly references (direct outlinks) */
	links: TFile[];
	/** List of all files that this file references, including indirect references (all outlinks recursively) */
	allLinks: TFile[];
}

/**
 * option for function moveFileAndInlinks
 */
export interface ISyncFileToAstroOpt extends IMoveFileToAstroOpt {
	/**
	 * whether include inlinks in the astro file
	 *
	 * @default false
	 */
	includeInlinks?: boolean;
}

interface ISyncFileToAstroResult {
	movedCount: number;
	skipedCount: number;
	replacedCount: number;
}

/**
 * move obsidian markdown file and relative files to destination folder
 * @params {TFile} obsidian file
 * @params {string} destination folder path in the vault, relative to the vault root, for example: "folder/subfolder"
 */
export async function moveFileAndInlinks(
	file: TFile,
	distFolder: string,
	opt: ISyncFileToAstroOpt,
): Promise<ISyncFileToAstroResult> {
	if (!opt.includeInlinks) {
		const res = await moveObFile(file, distFolder, opt);
		return {
			movedCount: res.moved ? 1 : 0,
			skipedCount: res.skiped ? 1 : 0,
			replacedCount: res.replaced ? 1 : 0,
		};
	}

	return await relatedMoveFilesImpl(file, distFolder, opt);
}

/**
 * Build backlinks graph for files in the given set using resolvedLinks
 * @param files Set of files to analyze
 * @param app Obsidian app instance
 * @returns Map where key is a file and value is set of files that reference it (backlinks)
 */
function buildBacklinksGraph(
	files: Set<TFile>,
	app: App,
): Map<TFile, Set<TFile>> {
	const referenceGraph = new Map<TFile, Set<TFile>>();
	const filePathSet = new Set<string>(Array.from(files).map((f) => f.path));
	const resolvedLinks = app.metadataCache.resolvedLinks;

	// Initialize reference graph entries for all files
	for (const file of files) {
		referenceGraph.set(file, new Set());
	}

	// Traverse resolvedLinks to find backlinks
	// resolvedLinks structure: Record<sourcePath, Record<targetPath, count>>
	for (const [sourcePath, targets] of Object.entries(resolvedLinks)) {
		// Only consider source files that are in our set
		if (!filePathSet.has(sourcePath)) {
			continue;
		}

		const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
		if (!(sourceFile instanceof TFile)) {
			continue;
		}

		// Check each target file in the resolvedLinks
		for (const targetPath of Object.keys(targets)) {
			// Only consider target files that are in our set
			if (!filePathSet.has(targetPath)) {
				continue;
			}

			const targetFile = app.vault.getAbstractFileByPath(targetPath);
			if (targetFile instanceof TFile && targetFile !== sourceFile) {
				// sourceFile references targetFile, so targetFile has a backlink from sourceFile
				const backlinks = referenceGraph.get(targetFile);
				if (backlinks) {
					backlinks.add(sourceFile);
				}
			}
		}
	}

	return referenceGraph;
}

/**
 * Build outlinks graph for files in the given set using resolvedLinks
 * @param files Set of files to analyze
 * @param app Obsidian app instance
 * @returns Map where key is a file and value is set of files it references (outlinks)
 */
function buildOutlinksGraph(
	files: Set<TFile>,
	app: App,
): Map<TFile, Set<TFile>> {
	const outlinksGraph = new Map<TFile, Set<TFile>>();
	const filePathSet = new Set<string>(Array.from(files).map((f) => f.path));
	const resolvedLinks = app.metadataCache.resolvedLinks;

	// Initialize outlinks graph entries for all files
	for (const file of files) {
		outlinksGraph.set(file, new Set());
	}

	// Traverse resolvedLinks to find outlinks
	// resolvedLinks structure: Record<sourcePath, Record<targetPath, count>>
	for (const [sourcePath, targets] of Object.entries(resolvedLinks)) {
		// Only consider source files that are in our set
		if (!filePathSet.has(sourcePath)) {
			continue;
		}

		const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
		if (!(sourceFile instanceof TFile)) {
			continue;
		}

		// Check each target file in the resolvedLinks
		for (const targetPath of Object.keys(targets)) {
			// Only consider target files that are in our set
			if (!filePathSet.has(targetPath)) {
				continue;
			}

			const targetFile = app.vault.getAbstractFileByPath(targetPath);
			if (targetFile instanceof TFile && targetFile !== sourceFile) {
				// sourceFile references targetFile (outlink)
				const outlinks = outlinksGraph.get(sourceFile);
				if (outlinks) {
					outlinks.add(targetFile);
				}
			}
		}
	}

	return outlinksGraph;
}

/**
 * Find all files that are referenced by a given file, including indirect references
 * Uses BFS to traverse the outlinks graph
 * @param file The starting file
 * @param outlinksGraph Map of file to its direct outlinks
 * @returns Set of all files referenced by the given file (including indirect)
 */
function findAllOutlinks(
	file: TFile,
	outlinksGraph: Map<TFile, Set<TFile>>,
): Set<TFile> {
	const allOutlinks = new Set<TFile>();
	const queue: TFile[] = [file];
	const visited = new Set<TFile>();

	// Mark the starting file as visited so it won't be added to results
	visited.add(file);

	while (queue.length > 0) {
		const currentFile = queue.shift()!;

		// Get direct outlinks for current file
		const directOutlinks = outlinksGraph.get(currentFile);
		if (directOutlinks) {
			for (const outlink of directOutlinks) {
				if (!visited.has(outlink)) {
					allOutlinks.add(outlink);
					visited.add(outlink);
					queue.push(outlink);
				}
			}
		}
	}

	return allOutlinks;
}

/**
 * Scan all related files by following outlinks (files that the current file references)
 * @param startFile The starting file to scan from
 * @param app Obsidian app instance
 * @returns Set of all related files found by following outlinks
 */
function scanRelatedFilesByOutlinks(
	startFile: TFile,
	app: App,
): Set<TFile> {
	const allRelatedFiles = new Set<TFile>();
	const fileToScan: TFile[] = [startFile];
	const scannedFiles = new Set<TFile>();

	while (fileToScan.length > 0) {
		const currentFile = fileToScan.pop()!;
		if (scannedFiles.has(currentFile)) {
			continue;
		}
		scannedFiles.add(currentFile);
		allRelatedFiles.add(currentFile);

		// Get outlinks for current file (files that currentFile references)
		const fileCache = app.metadataCache.getFileCache(currentFile);
		const outlinkFiles = new Set<TFile>();

		if (fileCache?.links) {
			for (const link of fileCache.links) {
				const outlinkFile = app.metadataCache.getFirstLinkpathDest(
					link.link,
					currentFile.path,
				);
				if (outlinkFile) {
					outlinkFiles.add(outlinkFile);
				}
			}
		}

		if (fileCache?.embeds) {
			for (const embed of fileCache.embeds) {
				const outlinkFile = app.metadataCache.getFirstLinkpathDest(
					embed.link,
					currentFile.path,
				);
				if (outlinkFile) {
					outlinkFiles.add(outlinkFile);
				}
			}
		}

		// Add outlink files to scan queue
		for (const outlinkFile of outlinkFiles) {
			if (!scannedFiles.has(outlinkFile)) {
				fileToScan.push(outlinkFile);
			}
		}
	}

	return allRelatedFiles;
}

/**
 * Scan all related files and collect their information
 */
function scanAllRelatedFiles(
	startFile: TFile,
	app: App,
): { allFiles: TFile[]; fileInfos: IFileMoveInfo[] } {
	// Step 1: Scan all related files (follow outlinks - files that currentFile points to)
	const allRelatedFiles = scanRelatedFilesByOutlinks(startFile, app);

	// Step 2: Build backlinks graph (for each file, find which files in the set reference it)
	const backlinksGraph = buildBacklinksGraph(allRelatedFiles, app);

	// Step 3: Build outlinks graph (for each file, find which files in the set it references)
	const outlinksGraph = buildOutlinksGraph(allRelatedFiles, app);

	// Step 4: Build file info list with all required information
	const fileInfos: IFileMoveInfo[] = Array.from(allRelatedFiles).map((file) => {
		const backlinks = Array.from(backlinksGraph.get(file) || []);
		const links = Array.from(outlinksGraph.get(file) || []);
		const allLinks = Array.from(findAllOutlinks(file, outlinksGraph));

		return {
			file,
			backlinks,
			links,
			allLinks,
		};
	});

	return {
		allFiles: Array.from(allRelatedFiles),
		fileInfos,
	};
}

async function relatedMoveFilesImpl(
	file: TFile,
	distFolder: string,
	opt: ISyncFileToAstroOpt,
): Promise<ISyncFileToAstroResult> {
	// Step 1: Scan all related files and collect information
	const { allFiles, fileInfos } = scanAllRelatedFiles(file, opt.app);

	// Step 2: Show modal with all file information and let user decide
	const selectedFiles = await showRelatedMoveConfirmModal(fileInfos, opt.app);
	if (!selectedFiles) {
		// User cancelled
		return {
			movedCount: 0,
			skipedCount: allFiles.length,
			replacedCount: 0,
		};
	}

	// Step 3: Move selected files
	const res: ISyncFileToAstroResult = {
		movedCount: 0,
		skipedCount: 0,
		replacedCount: 0,
	};

	for (const fileInfo of fileInfos) {
		if (selectedFiles.has(fileInfo.file)) {
			const fileMoveRes = await moveObFile(fileInfo.file, distFolder, opt);
			res.movedCount += fileMoveRes.moved ? 1 : 0;
			res.skipedCount += fileMoveRes.skiped ? 1 : 0;
			res.replacedCount += fileMoveRes.replaced ? 1 : 0;
		} else {
			res.skipedCount += 1;
		}
	}

	return res;
}

/**
 * Show modal with all file information and get user's selection
 */
function showRelatedMoveConfirmModal(
	fileInfos: IFileMoveInfo[],
	app: App,
): Promise<Set<TFile> | null> {
	return new Promise((resolve) => {
		const modal = new RelatedMoveConfirmModal(app, fileInfos, (selectedFiles) => {
			resolve(selectedFiles);
		});
		modal.open();
	});
}
