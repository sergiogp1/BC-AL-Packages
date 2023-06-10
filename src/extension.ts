import * as vscode from 'vscode';
import * as fs from 'fs';
import { RemoteZipPointer } from "@basisai/remote-zip";
import axios from 'axios';
import { XMLParser } from "fast-xml-parser";
import path from 'path';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('al-packages.downloadPackages', async () => {
		downloadedPackages = [];
		resourcesPath = context.asAbsolutePath(path.join('resources'));
		getALPackagesPath();

		const environmentType = await vscode.window.showQuickPick(['Sandbox', 'OnPrem'], {
			placeHolder: 'Select environment type',
		});

		if (!environmentType) {
			return;
		}

		const countryCode = await vscode.window.showQuickPick([
			{ label: "W1", description: "W1" },	{ label: "AD", description: "Andorra" }, { label: "AE", description: "United Arab Emirates" },	
			{ label: "AF", description: "Afghanistan" }, { label: "AG", description: "Antigua and Barbuda" }, { label: "AI", description: "Anguilla" },	
			{ label: "AL", description: "Albania" }, { label: "AM", description: "Armenia" }, { label: "AO", description: "Angola" }, { label: "AQ", description: "Antarctica" },
			{ label: "AR", description: "Argentina" }, { label: "AS", description: "American Samoa" }, { label: "AT", description: "Austria" },	
			{ label: "AU", description: "Australia" }, { label: "AW", description: "Aruba" }, { label: "AX", description: "Åland Islands" },	
			{ label: "AZ", description: "Azerbaijan" },	{ label: "BA", description: "Bosnia and Herzegovina" },	{ label: "BB", description: "Barbados" },	
			{ label: "BD", description: "Bangladesh" },	{ label: "BE", description: "Belgium" }, { label: "BF", description: "Burkina Faso" },
			{ label: "BG", description: "Bulgaria" }, { label: "BH", description: "Bahrain" }, { label: "BI", description: "Burundi" },	{ label: "BJ", description: "Benin" },	
			{ label: "BL", description: "Saint Barthélemy" }, { label: "BM", description: "Bermuda" }, { label: "BN", description: "Brunei Darussalam" },	
			{ label: "BO", description: "Bolivia" }, { label: "BQ", description: "Bonaire" }, { label: "BR", description: "Brazil" }, { label: "BS", description: "Bahamas" },	
			{ label: "BT", description: "Bhutan" },	{ label: "BV", description: "Bouvet Island" },	{ label: "BW", description: "Botswana" }, { label: "BY", description: "Belarus" },	
			{ label: "BZ", description: "Belize" },	{ label: "CA", description: "Canada" },	{ label: "CC", description: "Cocos (Keeling) Islands" },	
			{ label: "CF", description: "Central African Republic" }, { label: "CG", description: "Congo" }, { label: "CH", description: "Switzerland" }, { label: "CI", description: "Côte d'Ivoire" },	
			{ label: "CK", description: "Cook Islands" }, { label: "CL", description: "Chile" }, { label: "CM", description: "Cameroon" }, { label: "CN", description: "China" },	
			{ label: "CO", description: "Colombia" }, { label: "CR", description: "Costa Rica" }, { label: "CU", description: "Cuba" },	{ label: "CV", description: "Cape Verde" },	
			{ label: "CW", description: "Curaçao" }, { label: "CX", description: "Christmas Island" }, { label: "CY", description: "Cyprus" }, { label: "CZ", description: "Czech Republic" },	
			{ label: "DE", description: "Germany" }, { label: "DJ", description: "Djibouti" }, { label: "DK", description: "Denmark" },	{ label: "DM", description: "Dominica" },	
			{ label: "DO", description: "Dominican Republic" }, { label: "DZ", description: "Algeria" }, { label: "EC", description: "Ecuador" }, { label: "EE", description: "Estonia" },	
			{ label: "EG", description: "Egypt" }, { label: "EH", description: "Western Sahara" }, { label: "ER", description: "Eritrea" }, { label: "ES", description: "Spain" },	
			{ label: "ET", description: "Ethiopia" }, { label: "FI", description: "Finland" }, { label: "FJ", description: "Fiji" }, { label: "FK", description: "Falkland Islands (Malvinas)" },	
			{ label: "FM", description: "Micronesia" }, { label: "FO", description: "Faroe Islands" }, { label: "FR", description: "France" }, { label: "GA", description: "Gabon" },	
			{ label: "GB", description: "United Kingdom" },	{ label: "GD", description: "Grenada" }, { label: "GE", description: "Georgia" }, { label: "GF", description: "French Guiana" },	
			{ label: "GG", description: "Guernsey" }, { label: "GH", description: "Ghana" }, { label: "GI", description: "Gibraltar" },	{ label: "GL", description: "Greenland" },	
			{ label: "GM", description: "Gambia" },	{ label: "GN", description: "Guinea" },	{ label: "GP", description: "Guadeloupe" },	{ label: "GQ", description: "Equatorial Guinea" },	
			{ label: "GR", description: "Greece" },	{ label: "GS", description: "South Georgia and the South Sandwich Islands" }, { label: "GT", description: "Guatemala" },	
			{ label: "GU", description: "Guam" }, { label: "GW", description: "Guinea-Bissau" }, { label: "GY", description: "Guyana" }, { label: "HK", description: "Hong Kong" },	
			{ label: "HM", description: "Heard Island and McDonald Islands" }, { label: "HN", description: "Honduras" }, { label: "HR", description: "Croatia" }, { label: "HT", description: "Haiti" },	
			{ label: "HU", description: "Hungary" }, { label: "ID", description: "Indonesia" }, { label: "IE", description: "Ireland" }, { label: "IL", description: "Israel" },	
			{ label: "IM", description: "Isle of Man" }, { label: "IN", description: "India" },	{ label: "IO", description: "British Indian Ocean Territory" },	{ label: "IQ", description: "Iraq" },	
			{ label: "IR", description: "Iran" }, { label: "IS", description: "Iceland" }, { label: "IT", description: "Italy" }, { label: "JE", description: "Jersey" },
			{ label: "JM", description: "Jamaica" }, { label: "JO", description: "Jordan" }, { label: "JP", description: "Japan" },	{ label: "KE", description: "Kenya" },	
			{ label: "KG", description: "Kyrgyzstan" },	{ label: "KH", description: "Cambodia" }, { label: "KI", description: "Kiribati" },	{ label: "KM", description: "Comoros" },	
			{ label: "KN", description: "Saint Kitts and Nevis" }, { label: "KR", description: "South Korea" }, { label: "KW", description: "Kuwait" },	
			{ label: "KY", description: "Cayman Islands" },	{ label: "KZ", description: "Kazakhstan" },	{ label: "LA", description: "Lao People's Democratic Republic" },	
			{ label: "LB", description: "Lebanon" }, { label: "LC", description: "Saint Lucia" }, { label: "LI", description: "Liechtenstein" },	
			{ label: "LK", description: "Sri Lanka" }, { label: "LR", description: "Liberia" },	{ label: "LS", description: "Lesotho" }, { label: "LT", description: "Lithuania" },	
			{ label: "LU", description: "Luxembourg" },	{ label: "LV", description: "Latvia" },	{ label: "LY", description: "Libya" },	{ label: "MA", description: "Morocco" },	
			{ label: "MC", description: "Monaco" },	{ label: "MD", description: "Moldova" }, { label: "ME", description: "Montenegro" }, { label: "MF", description: "Saint Martin (French part)" },	
			{ label: "MG", description: "Madagascar" },	{ label: "MH", description: "Marshall Islands" }, { label: "MK", description: "Macedonia" }, { label: "ML", description: "Mali" },	
			{ label: "MM", description: "Myanmar" }, { label: "MN", description: "Mongolia" }, { label: "MO", description: "Macao" }, { label: "MP", description: "Northern Mariana Islands" },	
			{ label: "MQ", description: "Martinique" }, { label: "MR", description: "Mauritania" },	{ label: "MS", description: "Montserrat" },	{ label: "MT", description: "Malta" },	
			{ label: "MU", description: "Mauritius" }, { label: "MV", description: "Maldives" }, { label: "MW", description: "Malawi" }, { label: "MX", description: "Mexico" },	
			{ label: "MY", description: "Malaysia" }, { label: "MZ", description: "Mozambique" }, { label: "NA", description: "Namibia" }, { label: "NC", description: "New Caledonia" },	
			{ label: "NE", description: "Niger" }, { label: "NF", description: "Norfolk Island" }, { label: "NG", description: "Nigeria" }, { label: "NI", description: "Nicaragua" },	
			{ label: "NL", description: "Netherlands" }, { label: "NO", description: "Norway" }, { label: "NP", description: "Nepal" }, { label: "NR", description: "Nauru" },	
			{ label: "NU", description: "Niue" }, { label: "NZ", description: "New Zealand" }, { label: "OM", description: "Oman" }, { label: "PA", description: "Panama" },	
			{ label: "PE", description: "Peru" }, { label: "PF", description: "French Polynesia" },	{ label: "PG", description: "Papua New Guinea" }, { label: "PH", description: "Philippines" },	
			{ label: "PK", description: "Pakistan" }, { label: "PL", description: "Poland" }, { label: "PM", description: "Saint Pierre and Miquelon" },	
			{ label: "PN", description: "Pitcairn" }, { label: "PR", description: "Puerto Rico" }, { label: "PS", description: "Palestine" }, { label: "PT", description: "Portugal" },	
			{ label: "PW", description: "Palau" }, { label: "PY", description: "Paraguay" }, { label: "QA", description: "Qatar" }, { label: "RE", description: "Réunion" },	
			{ label: "RO", description: "Romania" }, { label: "RS", description: "Serbia" }, { label: "RU", description: "Russian Federation" }, { label: "RW", description: "Rwanda" },	
			{ label: "SA", description: "Saudi Arabia" }, { label: "SB", description: "Solomon Islands" }, { label: "SC", description: "Seychelles" }, { label: "SD", description: "Sudan" },	
			{ label: "SE", description: "Sweden" }, { label: "SG", description: "Singapore" }, { label: "SH", description: "Saint Helena" }, { label: "SI", description: "Slovenia" },	
			{ label: "SJ", description: "Svalbard and Jan Mayen" }, { label: "SK", description: "Slovakia" }, { label: "SL", description: "Sierra Leone" }, { label: "SM", description: "San Marino" },	
			{ label: "SN", description: "Senegal" }, { label: "SO", description: "Somalia" }, { label: "SR", description: "Suriname" }, { label: "SS", description: "South Sudan" },	
			{ label: "ST", description: "Sao Tome and Principe" }, { label: "SV", description: "El Salvador" }, { label: "SX", description: "Sint Maarten" }, { label: "SY", description: "Syrian Arab Republic" },	
			{ label: "SZ", description: "Swaziland" }, { label: "TC", description: "Turks and Caicos Islands" }, { label: "TD", description: "Chad" }, { label: "TF", description: "French Southern Territories" },	
			{ label: "TG", description: "Togo" }, { label: "TH", description: "Thailand" }, { label: "TJ", description: "Tajikistan" }, { label: "TK", description: "Tokelau" },	
			{ label: "TL", description: "Timor-Leste" }, { label: "TM", description: "Turkmenistan" }, { label: "TN", description: "Tunisia" },	{ label: "TO", description: "Tonga" },	
			{ label: "TR", description: "Turkey" },  { label: "TT", description: "Trinidad and Tobago" }, { label: "TV", description: "Tuvalu" }, { label: "TW", description: "Taiwan" },	
			{ label: "TZ", description: "Tanzania" }, { label: "UA", description: "Ukraine" }, { label: "UG", description: "Uganda" },	{ label: "UM", description: "United States Minor Outlying Islands" },	
			{ label: "US", description: "United States" }, { label: "UY", description: "Uruguay" }, { label: "UZ", description: "Uzbekistan" }, { label: "VA", description: "Holy See (Vatican City State)" },	
			{ label: "VC", description: "Saint Vincent and the Grenadines" }, { label: "VE", description: "Venezuela" }, { label: "VG", description: "Virgin Islands, British" },
			{ label: "VI", description: "Virgin Islands, U.S." }, { label: "VN", description: "Viet Nam" },	{ label: "VU", description: "Vanuatu" }, { label: "WF", description: "Wallis and Futuna" },	
			{ label: "WS", description: "Samoa" }, { label: "YE", description: "Yemen" }, { label: "YT", description: "Mayotte" }, { label: "ZA", description: "South Africa" },	
			{ label: "ZM", description: "Zambia" }, { label: "ZW", description: "Zimbabwe"}
		], 
		{
			placeHolder: 'Select a country'
		});

		if (!countryCode) {
			return;
		}

		const artifactVersions = convertArtifactVersionsToArray(environmentType.toLowerCase(), countryCode.label.toLowerCase());
		if (artifactVersions.length == 0) {
			vscode.window.showErrorMessage(`No symbols found for ${countryCode.description}`);
			return;
		}

		const version = await vscode.window.showQuickPick(artifactVersions, {
			placeHolder: 'Select version'
		});

		if (!version) {
			return;
		}

		try {
			vscode.window.showInformationMessage(`Downloading symbols...`);
			await downloadArtifacts(environmentType.toLowerCase(), version, countryCode.label.toLowerCase());
			
			const versionArray = version.split('.');
			const major = parseInt(versionArray[0]);

			switch (true) {
				case (major >= 16):
					if (downloadedPackages.length == 0) {
						vscode.window.showWarningMessage(`None symbols downloaded`);
					} else if (downloadedPackages.length == 4) {
						vscode.window.showInformationMessage(`Symbols downloaded`);
					} else {
						vscode.window.showWarningMessage(`Symbols downloaded but not all of them`);
					}						
					break;
				case (major == 15):
					if (downloadedPackages.length == 0) {
						vscode.window.showWarningMessage(`None symbols downloaded`);
					} else if (downloadedPackages.length == 3 || downloadedPackages.length == 4) {
						vscode.window.showInformationMessage(`Symbols downloaded`);
					} else {
						vscode.window.showWarningMessage(`Symbols downloaded but not all of them`);
					}
					break;
				default:
					if (downloadedPackages.length == 0) {
						vscode.window.showWarningMessage(`None symbols downloaded`);
					} else {
						vscode.window.showInformationMessage(`Symbols downloaded`);
					}
			}			
		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error}`);
		}
	});

	let disposable2 = vscode.commands.registerCommand('al-packages.downloadArtifactVersions', async () => {
		resourcesPath = context.asAbsolutePath(path.join('resources'));
		vscode.window.showInformationMessage(`Downloading list of artifacts... It takes around 10 seconds`);
		await downloadArtifactVersions();
		vscode.window.showInformationMessage(`List of artifacts updated. Now run command: AL: Download packages`);
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
}

async function downloadArtifacts(environmentType: string, version: string, countryCode: string): Promise<void> {
	const versionByEnvironment = environmentType == "sandbox" ? "_" + version : "";

	let artifactURL = `https://bcartifacts.azureedge.net/${environmentType}/${version}/${countryCode}`;
	let url = new URL(artifactURL);
	let remoteZip = await new RemoteZipPointer({url}).populate();
	let files = remoteZip.files();

	let microsoftApplication = new ArrayBuffer(0);
	let microsoftSystemApplication = new ArrayBuffer(0);
	let microsoftBaseApplication = new ArrayBuffer(0);

	const microsoftApplicationIndex = files.findIndex(file => file.filename.endsWith(`Microsoft_Application${versionByEnvironment}.app`));
	if (microsoftApplicationIndex !== -1) {
		microsoftApplication = await remoteZip.fetch(files[microsoftApplicationIndex].filename);
		downloadedPackages.push(`Application`);
	}
	
	const microsoftSystemApplicationIndex = files.findIndex(file => file.filename.endsWith(`Microsoft_System Application${versionByEnvironment}.app`));
	if (microsoftSystemApplicationIndex !== -1) {
		microsoftSystemApplication = await remoteZip.fetch(files[microsoftSystemApplicationIndex].filename);
		downloadedPackages.push(`System Application`);
	}

	const microsoftBaseApplicationIndex = files.findIndex(file => file.filename.endsWith(`Microsoft_Base Application${versionByEnvironment}.app`));
	if (microsoftBaseApplicationIndex !== -1) {
		microsoftBaseApplication = await remoteZip.fetch(files[microsoftBaseApplicationIndex].filename);
		downloadedPackages.push(`Base Application`);
	}

	if (microsoftApplication.byteLength !== 0) {
		ALPackagesPaths.forEach(ALPackagesPath => {
			fs.writeFile(`${ALPackagesPath}\\Microsoft_Application_${version}.app`, Buffer.from(microsoftApplication), (err) => {});
		});
	}
	if (microsoftSystemApplication.byteLength !== 0) {
		ALPackagesPaths.forEach(ALPackagesPath => {
			fs.writeFile(`${ALPackagesPath}\\Microsoft_System Application_${version}.app`, Buffer.from(microsoftSystemApplication), (err) => {});
		});
	}
	if (microsoftBaseApplication.byteLength !== 0) {
		ALPackagesPaths.forEach(ALPackagesPath => {
			fs.writeFile(`${ALPackagesPath}\\Microsoft_Base Application_${version}.app`, Buffer.from(microsoftBaseApplication), (err) => {});
		});
	}

	artifactURL = `https://bcartifacts.azureedge.net/${environmentType}/${version}/platform`;
	url = new URL(artifactURL);
	remoteZip = await new RemoteZipPointer({url}).populate();
	files = remoteZip.files();
	let microsoftSystem = new ArrayBuffer(0);	

	const microsoftSystemIndex = files.findIndex(file => file.filename.endsWith('System.app'));
	if (microsoftSystemIndex !== -1) {
		microsoftSystem = await remoteZip.fetch(files[microsoftSystemIndex].filename);
		downloadedPackages.push(`System`);
	}

	if (microsoftSystem.byteLength !== 0) {
		ALPackagesPaths.forEach(ALPackagesPath => {
			fs.writeFile(`${ALPackagesPath}\\Microsoft_System_${version}.app`, Buffer.from(microsoftSystem), (err) => {});
		});
	}
}

function convertArtifactVersionsToArray(selectedEnvironmentType: string, selectedCountryCode: string): string[] {
	let artifactLinksTxt = "";

	if (selectedEnvironmentType == 'sandbox') {
		artifactLinksTxt = fs.readFileSync(`${resourcesPath}\\sandbox_versions.txt`, 'utf8');
	} else {
		artifactLinksTxt = fs.readFileSync(`${resourcesPath}\\onprem_versions.txt`, 'utf8');
	}

	return artifactLinksTxt.split(';').filter(link => link.endsWith(selectedCountryCode)).map(link => {
		const countryIndex = link.lastIndexOf('/');
		return link.substring(0, countryIndex) + link.substring(countryIndex + selectedCountryCode.length + 1);
	  }).sort((a, b) => {
		const versionA = a.split('.').map(Number);
		const versionB = b.split('.').map(Number);
	
		for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
			const numA = versionA[i] || 0;
			const numB = versionB[i] || 0;
	
			if (numA !== numB) {
				return numA - numB;
		  	}
		}
	
		return 0;
	});
}

async function getALPackagesPath(): Promise<void> {
	ALPackagesPaths = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders && workspaceFolders.length > 0) {
		workspaceFolders.forEach(workspaceFolder => {
			const alPackagesPath = vscode.Uri.joinPath(workspaceFolder.uri, '.alpackages').path.slice(1).replace(new RegExp("/", "g"), '\\');
			if (!fs.existsSync(alPackagesPath)) {
				fs.mkdir(alPackagesPath, { recursive: false }, (err) => {});
			}

			ALPackagesPaths.push(alPackagesPath);
		});
    } else {
		ALPackagesPaths.push(process.env.USERPROFILE + "\\Downloads");
		vscode.window.showWarningMessage('No folder is open. Symbols will be placed in your Downloads folder.');
    }
}

async function downloadArtifactVersions(): Promise<void> {
	let environmentTypes: string[] = ["sandbox", "onprem"];

	return new Promise<void>(async (resolve) => {
		const promises = environmentTypes.map(async environmentType => {
			let nextMarkerParameter;

			fs.writeFile(`${resourcesPath}\\${environmentType}_versions.txt`, '', (err) => {});

			do {
				await axios({
					method: 'get',
					url: `https://bcartifacts.azureedge.net/${environmentType}?comp=list&restype=container${nextMarkerParameter}`,
					timeout: 10000 // 10s
				}).then(response => {
					const parser = new XMLParser();
					let artifactsInJObj = parser.parse(response.data);
					let versions = "";

					const Blobs = artifactsInJObj.EnumerationResults.Blobs.Blob;
					Blobs.forEach((Blob: { Name: string; }) => {
						versions += Blob.Name + ";";
					});
					
					fs.appendFile(`${resourcesPath}\\${environmentType}_versions.txt`, versions, (err) => {});
			
					nextMarkerParameter = artifactsInJObj.EnumerationResults.NextMarker;
					if (nextMarkerParameter != "") {
						nextMarkerParameter = "&marker=" + nextMarkerParameter;
					}
				}).catch(error => {
					vscode.window.showErrorMessage(error);
				});
			} while (nextMarkerParameter != "");
		});

		await Promise.all(promises);
		resolve();
	});
}

let ALPackagesPaths: string[] = [];
let resourcesPath: string;
let downloadedPackages: string[] = [];

export function deactivate() {}