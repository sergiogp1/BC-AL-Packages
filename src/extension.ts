import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RemoteZipPointer } from "@basisai/remote-zip";
import { selectCountry } from './countries';

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
	const selectedVersion = await selectVersion(`${baseURL}/${appJson.target}/indexes/${countryCode}.json`, appJson.application);
	
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
		downloadSystemApp(appJson, selectedVersion, alPackagesPaths);
		vscode.window.showInformationMessage('Symbols downloaded successfully!');
	} catch (error) {
		vscode.window.showErrorMessage(`Error writing symbols: ${error}`);
		throw error;
	}
}

async function downloadSystemApp(appJson: any, selectedVersion: string, alPackagesPaths?: string[]): Promise<void> {
	const baseURL = 'https://bcartifacts-exdbf9fwegejdqak.b02.azurefd.net';
	const writePromises: Promise<void>[] = [];
	
	let url = new URL(`${baseURL}/${appJson.target}/${selectedVersion}/platform`);
	let remoteZip = await new RemoteZipPointer({url}).populate();
	let files = remoteZip.files();
	let buffer2: { buffer: ArrayBuffer; filename: string } | null = null;

	const index = files.findIndex(file => file.filename === 'System.app');
	if (index !== -1 ) {
		buffer2 = { buffer: await remoteZip.fetch(files[index].filename), filename: path.basename(files[index].filename) };
	}
	
	if (alPackagesPaths && buffer2) {
		for (const alPackagesPath of alPackagesPaths) {
			writePromises.push(fs.promises.writeFile(`${alPackagesPath}\\${buffer2.filename}`, new Uint8Array(buffer2.buffer)));
		}
	}

	try {
		await Promise.all(writePromises);
	} catch (error) {
		vscode.window.showErrorMessage(`Error writing symbols: ${error}`);
		throw error;
	}
}

//TODO: arreglar
async function selectVersion(indexURL: string, version: string): Promise<string> {
	const response = await fetch(indexURL);
	const versions: Array<{ Version: string; CreationTime: string }> = await response.json();
	const requestedParts = version.split('.').map(Number);
	
	let matchingVersions = versions.filter(v => {
		const versionParts = v.Version.split('.').map(Number);
		
		for (let i = 0; i < requestedParts.length; i++) {
			if (versionParts[i] !== requestedParts[i]) {
				return false;
			}
		}

		return true;
	});
	
	if (matchingVersions.length === 0) {
		const majorVersion = requestedParts[0];
		matchingVersions = versions.filter(v => {
			const versionParts = v.Version.split('.').map(Number);
			return versionParts[0] === majorVersion;
		});
	}
		
	matchingVersions.sort((a, b) =>  new Date(b.CreationTime).getTime() - new Date(a.CreationTime).getTime());
	return matchingVersions[0].Version;
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
	} else { //TODO: eliminar
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
	}

	return alPackagesPaths;
}

function readAppJson(): any {
	/*const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		throw new Error('No workspace folder found.');
	}

	const appJsonPath = path.join(workspaceFolders[0].uri.fsPath, 'app.json');
	if (!fs.existsSync(appJsonPath)) {
		throw new Error('app.json not found in workspace root.');
	}*/

	try {
		let appJson = JSON.parse('{"id":"c1bb7873-fe8b-4eab-bec2-90a12e71e0a2","name":"BC_APP","publisher":"CRAZE GmbH","version":"2.0.0.378","brief":"","description":"","privacyStatement":"https://craze.toys/","EULA":"https://craze.toys/","help":"https://craze.toys/","url":"https://craze.toys/","supportedLocales":["en-US","es-ES"],"platform":"1.0.0.0","application":"26.0.0.0","dependencies":[{"id":"70912191-3c4c-49fc-a1de-bc6ea1ac9da6","name":"Intrastat Core","publisher":"Microsoft","version":"25.0.0.0"},{"id":"a01864f8-9c3f-42f6-8328-8d7be1ce3e20","name":"_Exclude_Master_Data_Management","publisher":"Microsoft","version":"25.0.0.0"}],"screenshots":[],"idRanges":[{"from":50000,"to":50150},{"from":60000,"to":60150},{"from":80000,"to":80100}],"resourceExposurePolicy":{"allowDebugging":true,"allowDownloadingSource":false,"includeSourceInSymbolFile":false},"runtime":"15.0","features":["TranslationFile","GenerateCaptions","NoImplicitWith"],"target":"Cloud","suppressWarnings":["AA0210"]}');
		//let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
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

export function deactivate() {}