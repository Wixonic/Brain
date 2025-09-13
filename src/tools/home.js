import os from "os";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async () => `Le chemin vers le dossier personnel de l'utilisateur est: ${os.homedir()}`,
	definition: {
		type: "function",
		function: {
			name: "home",
			description: "Récupère le dossier personnel de l'utilisateur."
		}
	},
	display: () => "Récupère le dossier personnel"
};

export default tool;