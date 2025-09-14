import { exec } from "child_process";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: (args) => new Promise((resolve) => exec(args.command, (error, stdout, stderr) => {
		if (error) {
			console.error(format(`Failed to execute command: ${error}.\nError output: ${stderr}`, "dim", "red"));
			resolve(`Erreur lors de l'exécution de la commande: ${error.message}\n Sortie d'erreur: ${stderr}`);
		} else resolve(`Résultat de la commande: ${stdout.length > 0 ? stdout : "Commande exécutée avec succès"}`);
	})),
	definition: {
		type: "function",
		function: {
			name: "execute",
			description: "Execute une commande sur le zsh.",
			parameters: {
				type: "object",
				properties: {
					command: {
						type: "string",
						description: "La commande zsh à exécuter."
					}
				},
				required: ["command"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Execute la commande: ${args.command}` : "Execute une commande"
};

export default tool;