import os from "os";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async () => `Le chemin vers le fichier de l'utilisateur est: ${os.homedir()}`,
	definition: {
		type: "function",
		function: {
			name: "home",
			description: "Récupère le dossier racine de l'utilisateur."
		}
	},
	display: () => "Récupère le dossier racine"
};

export default tool;