import path from "path";
import fs from "fs/promises";
import os from "os";

import { format } from "../lib/format.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (rl, args) => {
		try {
			const dirPath = path.join(os.homedir(), "Brain/downloads");
			const url = new URL(args.url);
			const fileName = path.join(url.hostname, path.basename(url.pathname));
			const filePath = path.join(dirPath, fileName);

			await fs.mkdir(dirPath, {
				recursive: true
			});

			const response = await fetch(args.url);
			if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
			const content = await response.bytes();
			await fs.writeFile(filePath, content);
			return `Fichier téléchargé depuis "${args.url}" et sauvegardé à "${filePath}".`;
		} catch (e) {
			if (process.env.debug == "true") console.log(format(`Download failed: ${e}`, "dim", "red"));
			return "Échec du téléchargement";
		}
	},
	definition: {
		type: "function",
		function: {
			name: "download",
			description: "Télécharge un fichier ou une page depuis une URL.",
			parameters: {
				type: "object",
				properties: {
					url: {
						type: "string",
						description: "L'URL à télécharger."
					}
				},
				required: ["url"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Télécharge ${args.url}` : "Télécharge un fichier"
};

export default tool;