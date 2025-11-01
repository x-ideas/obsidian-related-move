import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import path from 'path';
import type { App, TFile, Vault } from 'obsidian';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { vol } from 'memfs';
import { moveObFile } from '../../api/index.js';

vi.unmock('node:fs/promises');
vi.mock('fs');
vi.mock('node:fs/promises');

// vi.mock('node:fs');

// __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

beforeEach(() => {
	vol.reset();
});

describe('sync-file', () => {
	it('only current file', async () => {
		const getFirstLinkpathDestFn = vi.fn().mockImplementation(() => {
			return '/asserts/ww';
		});
		const readFn = vi.fn().mockImplementation(async () => {
			const vfs = await vi.importActual<{
				readFile: (path: string, opt?: unknown) => Promise<string>;
			}>('fs/promises');

			// read ./mds/no-links.input.md
			const content = await vfs.readFile(
				path.resolve(__dirname, './mds/no-links.input.md'),
				'utf-8',
			);

			console.log('content', content);
			return content;
		});
		const app = {
			vault: {
				read: readFn,
			},
			metadataCache: {
				getFirstLinkpathDest: getFirstLinkpathDestFn,
			},
		} as unknown as App;

		const file: TFile = {
			vault: app.vault as unknown as Vault,
			path: '',
			name: 'no-links.input.md',
			extension: 'md',
			basename: 'no-links.input',
			stat: {
				ctime: Date.now(),
				mtime: Date.now(),
				size: 0,
			},
			parent: null,
		};

		await moveObFile(file, '/valid/path', { app });

		expect(readFn).toHaveBeenCalledWith(file);
		expect(getFirstLinkpathDestFn).not.toHaveBeenCalled();
		expect(mkdir).toHaveBeenCalledWith('/valid/path', { recursive: true });

		expect(1).toBe(1);
	});
});

// describe('sync-file', () => {
//   // Verifies that the content is read from the TFile without any data loss.
//   it('should read content from a TFile without data loss', async () => {
//     // const ob = await vi.importMock('obsidian');

//     const app = {
//       vault: {
//         read: vi.fn().mockResolvedValue('[[image.png]]'),
//       },
//     };

//     const mockVault = { read: vi.fn().mockResolvedValue('[[image.png]]') };
//     const mockApp = { vault: mockVault };
//     const mockFile = { name: 'test' };
//     const mockOpt = { app: mockApp };
//     const distFolder = '/valid/path';

//     await moveObFile(mockFile, distFolder, mockOpt);

//     expect(mockVault.read).toHaveBeenCalledWith(mockFile);
//     // Add assertions to check if writeFile was called with correct arguments
//   });

//   // Ensures the new file is created in the specified directory with the correct name.
//   it('should create a new file in the specified directory with the correct name', async () => {
//     const mockVault = { read: vi.fn().mockResolvedValue('[[image.png]]') };
//     const mockApp = { vault: mockVault };
//     const mockFile = { name: 'test' };
//     const mockOpt = { app: mockApp };
//     const distFolder = '/valid/path';

//     await moveObFile(mockFile, distFolder, mockOpt);

//     expect(mockVault.read).toHaveBeenCalledWith(mockFile);
//     // Add assertions to check if writeFile was called with correct arguments
//   });

//   // Confirms that the content is written to the new file accurately.
//   it('should write content to a new file in the specified directory accurately', async () => {
//     const mockVault = { read: vi.fn().mockResolvedValue('[[image.png]]') };
//     const mockApp = { vault: mockVault };
//     const mockFile = { name: 'test' };
//     const mockOpt = { app: mockApp };
//     const distFolder = '/valid/path';

//     await moveObFile(mockFile, distFolder, mockOpt);

//     expect(mockVault.read).toHaveBeenCalledWith(mockFile);
//     // Add assertions to check if writeFile was called with correct arguments
//   });

//   // Checks that the function completes without throwing any errors during the process.
//   it('should complete without errors', async () => {
//     const mockVault = { read: vi.fn().mockResolvedValue('[[image.png]]') };
//     const mockApp = { vault: mockVault };
//     const mockFile = { name: 'test' };
//     const mockOpt = { app: mockApp };
//     const distFolder = '/valid/path';

//     await moveObFile(mockFile, distFolder, mockOpt);

//     expect(mockVault.read).toHaveBeenCalledWith(mockFile);
//     // Add assertions to check if writeFile was called with correct arguments
//   });

//   // Verifies that the destination folder is created when it does not already exist.
//   it('should create destination folder if it does not exist', async () => {
//     const mockVault = { read: vi.fn().mockResolvedValue('[[image.png]]') };
//     const mockApp = { vault: mockVault };
//     const mockFile = { name: 'test' };
//     const mockOpt = { app: mockApp };
//     const distFolder = '/valid/path';

//     await moveObFile(mockFile, distFolder, mockOpt);

//     expect(mockVault.read).toHaveBeenCalledWith(mockFile);
//     expect(mkdir).toHaveBeenCalledWith(distFolder, { recursive: true });
//     // Add assertions to check if writeFile was called with correct arguments
//   });
// });
