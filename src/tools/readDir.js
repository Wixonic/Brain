import fs from "fs/promises";
import path from "path";

import { format } from "../lib/format.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (args) => {
		try {
			const content = await fs.readdir(args.path, {
				recursive: args.recursive
			});
			return `Lecture du contenu do dossier à "${args.path}".\n\n${content.map((filePath) => `- ${path.join(args.path, filePath)}`).join("\n")}`;
		} catch (e) {
			if (process.env.debug == "true") console.log(format(`Failed to read dir: ${e}`, "dim", "red"));

			switch (e.code) {
				case "ENOENT":
					return `Le dossier à l'emplacement "${args.path}" n'existe pas.`;
				case "EACCES":
					return `Accès refusé pour lire le dossier à l'emplacement "${args.path}".`;
				default:
					return `Échec de la lecture du dossier : ${e.message}`;
			}
		}
	},
	definition: {
		type: "function",
		function: {
			name: "readDir",
			description: "Lit un dossier sur le disque.",
			parameters: {
				type: "object",
				properties: {
					recursive: {
						type: "boolean",
						description: "Si la requête doit être récursive (défaut: false). À éviter."
					},
					path: {
						type: "string",
						description: "Le chemin du dossier."
					}
				},
				required: ["path"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Récupère le contenu du dossier ${args.path}${args.recursive ? " de manière récursive" : ""}` : "Récupère un dossier"
};

export default tool;