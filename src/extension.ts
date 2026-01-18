import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RemoteZipPointer } from "@basisai/remote-zip";
import { selectCountry } from './countries';

interface VersionInfo {
	Version: string;
	CreationTime: string;
}

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('al-packages.downloadPackages', async () => {		
		const appJson = readAppJson();
		const alPackagesPaths = await getALPackagesPaths();

		let countryCodeLbl = await selectCountry();
		if (!countryCodeLbl) { return; }
		let countryCode = countryCodeLbl.label.toLocaleLowerCase();

		try {
			await downloadArtifacts(appJson, countryCode, alPackagesPaths);
			await vscode.commands.executeCommand('workbench.action.reloadWindow');
		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error}`);
		}
	});

	context.subscriptions.push(disposable);
}

async function downloadArtifacts(appJson: any, countryCode: string, alPackagesPaths?: string[]): Promise<void> {
	const baseURL = 'https://bcartifacts-exdbf9fwegejdqak.b02.azurefd.net';
	const writePromises: Promise<void>[] = [];
	const selectedVersion = await findClosestVersion(`${baseURL}/${appJson.target}/indexes/${countryCode}.json`, appJson.application);
	
	let url = new URL(`${baseURL}/${appJson.target}/${selectedVersion}/${countryCode}`);
	let remoteZip = await new RemoteZipPointer({url}).populate();
	let files = remoteZip.files();
	let arrayBuffers: Array<{buffer: ArrayBuffer, filename: string}> = [];
	let symbolsToDownload = ['_Application_', '_System Application_', '_Base Application_', '_Business Foundation_'];

	if (appJson.dependencies && Array.isArray(appJson.dependencies)) {
		appJson.dependencies.forEach((dep: any) => {
			if (dep.name) {
				if (dep.name.startsWith('_')) {
					symbolsToDownload.push(`${dep.name}_`);
				} else {
					symbolsToDownload.push(`_${dep.name}_`);
				}
			}
		});
	}

	let processedIndices = new Set<number>();
	for (const symbol of symbolsToDownload) {
		const index = files.findIndex(file => file.filename.includes(symbol));
		if (index !== -1 && !processedIndices.has(index)) {
			processedIndices.add(index);
			const buffer = await remoteZip.fetch(files[index].filename);
			if (buffer.byteLength !== 0) {
				arrayBuffers.push({buffer: buffer, filename: path.basename(files[index].filename)});
			}
		}
	}
	
	if (arrayBuffers.length == 0) {
		vscode.window.showWarningMessage('No symbols found to download.');
		return;
	} 
	
	vscode.window.showInformationMessage('Downloading symbols...');
	if (alPackagesPaths) {
		for (const arrayBuffer of arrayBuffers) {
			for (const alPackagesPath of alPackagesPaths) {
				writePromises.push(fs.promises.writeFile(`${alPackagesPath}\\${arrayBuffer.filename}`, new Uint8Array(arrayBuffer.buffer)));
			}
		}
	}

	try {
		await Promise.all(writePromises);
		await downloadSystemApp(appJson, selectedVersion, alPackagesPaths);
		vscode.window.showInformationMessage('Symbols downloaded successfully!');
	} catch (error) {
		vscode.window.showErrorMessage(`Error writing symbols: ${error}`);
		throw error;
	}
}

async function downloadSystemApp(appJson: any, selectedVersion?: string, alPackagesPaths?: string[]): Promise<void> {
	const baseURL = 'https://bcartifacts-exdbf9fwegejdqak.b02.azurefd.net';
	const writePromises: Promise<void>[] = [];
	
	let url = new URL(`${baseURL}/${appJson.target}/${selectedVersion}/platform`);
	let remoteZip = await new RemoteZipPointer({url}).populate();
	let files = remoteZip.files();

	const index = files.findIndex(file => file.filename.endsWith('/System.app'));
	let systemApp = await remoteZip.fetch(files[index].filename);
	
	if (alPackagesPaths) {
		for (const alPackagesPath of alPackagesPaths) {
			writePromises.push(fs.promises.writeFile(`${alPackagesPath}\\Microsoft_System_${selectedVersion}.app`, new Uint8Array(systemApp)));
		}
	}

	try {
		await Promise.all(writePromises);
	} catch (error) {
		vscode.window.showErrorMessage(`Error writing symbols: ${error}`);
		throw error;
	}
}

async function findClosestVersion(url: string, versionFormat: string): Promise<string | undefined> {
	try {
		const response = await fetch(url);    
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const versions: VersionInfo[] = await response.json();
		
		if (!versions || versions.length === 0) {
			return undefined;
		}
		
		const [w, x, y, z] = parseVersion(versionFormat);
		
		if (w !== 0 && z !== 0) {
			const exact = versions.find(v => v.Version === versionFormat);
			if (exact) {
				return exact.Version;
			}

			return versions[versions.length - 1].Version || undefined;
		}
		
		const exactMatch = versions.find(v => v.Version === versionFormat);
		if (exactMatch) {
			return exactMatch.Version;
		}
		
		const filtered = versions.filter(v => {
			const [vw, vx, vy, vz] = parseVersion(v.Version);
		
			if (w !== 0 && vw !== w) {
				return false;
			}
		
			if (x !== 0 && vx !== x) {
				return false;
			}

			if (y !== 0 && !vy.toString().startsWith(y.toString())) {
				return false;
			}
		
			if (z !== 0 && vz !== z) {
				return false;
			}
		
			return true;
		});
		
		return filtered.length > 0 ? filtered[filtered.length - 1].Version : undefined;
  	} catch (error) {
		throw error;
	}
}

async function getALPackagesPaths(): Promise<string[]> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const alPackagesPaths: string[] = [];

	if (workspaceFolders && workspaceFolders.length > 0) {
		for (const workspaceFolder of workspaceFolders) {
			const alPackagesPath = path.join(workspaceFolder.uri.fsPath, '.alpackages');
			
			if (!fs.existsSync(alPackagesPath)) {
				fs.mkdirSync(alPackagesPath, { recursive: true });
			}
			
			alPackagesPaths.push(alPackagesPath);
		}
	}/* else {
		const selectedUri = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			title: 'Select a folder to download symbols',
			openLabel: 'Select'
		});

		if (selectedUri && selectedUri.length > 0) {
			const downloadPath = selectedUri[0].fsPath;
			alPackagesPaths.push(downloadPath);
		} else {
			vscode.window.showWarningMessage('No folder selected. Download cancelled.');
			return [];
		}
	}*/

	return alPackagesPaths;
}

function readAppJson(): any {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		throw new Error('No workspace folder found.');
	}

	const appJsonPath = path.join(workspaceFolders[0].uri.fsPath, 'app.json');
	if (!fs.existsSync(appJsonPath)) {
		throw new Error('app.json not found in workspace root.');
	}

	try {
		//let appJson = JSON.parse('{"id":"c1bb787....}');
		let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
		let environmentType = (appJson.target || '').toString().toLocaleLowerCase();
		if (environmentType === 'cloud' || environmentType === 'extension') {
			appJson.target = 'sandbox';
		} else {
			appJson.target = 'onprem';
		}

		return appJson;
	} catch (err) {
		throw new Error('Failed to parse app.json.');
	}
}

function parseVersion(version: string): number[] {
	return version.split('.').map(Number);
}

export function deactivate() {}