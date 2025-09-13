import os from "os";
import path from "path";

/** @type {import("../types").Tool} */
const tool = {
	call: async () => `Le chemin vers le dossier iCloud Drive de l'utilisateur est: ${path.join(os.homedir(), "/Library/Mobile Documents/com~apple~CloudDocs/")}`,
	definition: {
		type: "function",
		function: {
			name: "iCloudDrive",
			description: "Récupère le dossier iCloud Drive de l'utilisateur."
		}
	},
	display: () => "Récupère le dossier iCloud Drive"
};

export default tool;