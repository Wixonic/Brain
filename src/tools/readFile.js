import fs from "fs/promises";
import path from "path";
import pdf from "pdf-parse";

import { format } from "../lib/format.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (rl, args) => {
		try {
			let content = "";

			if (path.extname(args.path).toLowerCase() == ".pdf") {
				const dataBuffer = await fs.readFile(args.path);
				const data = await pdf(dataBuffer);
				content = data.text;
			} else content = await fs.readFile(args.path, { encoding: args.encoding ?? "utf-8" });

			const start = args.start || 0;
			const end = Math.min(content.length, args.end || 32768);

			return `Lecture du fichier à "${args.path}".\nPlage: ${start}-${end} (total: ${content.length})\n\nContenu:\n${content.substring(start, end)}.`;
		} catch (e) {
			if (process.env.debug == "true") console.log(format(`Failed to read file: ${e}`, "dim", "red"));

			switch (e.code) {
				case "ENOENT":
					return `Le fichier à l'emplacement "${args.path}" n'existe pas.`;
				case "EACCES":
					return `Accès refusé pour lire le fichier à l'emplacement "${args.path}".`;
				default:
					return `Échec de la lecture du fichier : ${e.message}`;
			}
		}
	},
	definition: {
		type: "function",
		function: {
			name: "readFile",
			description: "Lit un fichier (texte ou PDF) sur le disque.",
			parameters: {
				type: "object",
				properties: {
					encoding: {
						type: "string",
						description: "L'encodage de lecture (défaut: utf-8)",
						enum: [
							"ascii",
							"base64",
							"base64url",
							"binary",
							"hex",
							"utf-8"
						]
					},
					path: {
						type: "string",
						description: "Le chemin du fichier."
					},
					start: {
						type: "integer",
						description: "L'index de début de la lecture (défaut: 0)."
					},
					end: {
						type: "integer",
						description: "L'index de fin de la lecture (défaut: 32768)."
					}
				},
				required: ["path"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Lit ${args.path}${args.encoding ? ` avec l'encodage ${args.encoding}` : ""}` : "Lit un fichier"
};

export default tool;