import { spawnSync } from "child_process";

import { format } from "../lib/format.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (rl, args) => {
		try {
			await new Promise((resolve, reject) => {
				rl.question(`${format("Brain tente d'exécuter la commande suivante :", "brightYellow")}\n${format(args.command, "yellow")}\n${format("Acceptez-vous l'exécution de la commande ?", "brightYellow")} (o/n) > `, (answer) => {
					if (!answer.trim().toLowerCase().startsWith("o")) reject("L'utilisateur a manuellement refusé l'exécution de la commande. Merci de ne pas réessayer, et de demander à l'utilisateur la raison de ce refus.");
					resolve();
				});
			});

			const command = spawnSync(args.command, { shell: true });
			if (command.error) throw command.error;
			return command.stdout.toString();
		} catch (e) {
			return `Une erreur est survenue lors de l'exécution de la commande. Le message d'erreur suivant a été retourné :\n${e.message}`;
		}
	},
	definition: {
		type: "function",
		function: {
			name: "shell",
			description: "Permet d'éxécuter des commandes sur le système. Il vaut mieux faire une suite de commande complète plutôt que de lancer plusieurs commandes séparément.",
			parameters: {
				type: "object",
				properties: {
					command: {
						type: "string",
						description: "La commande à exécuter sur le zsh."
					}
				},
				required: ["command"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Execute : ${args.command}` : "Exécute une commande."
};

export default tool;