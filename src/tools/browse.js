import { JSDOM } from "jsdom";
import { format } from "../lib/format.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (rl, args) => {
		try {
			const response = await fetch(args.url);
			if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
			const html = await response.text();
			const dom = new JSDOM(html, {
				url: args.url
			});
			const document = dom.window.document;
			const content = document.body.textContent;

			const start = args.start || 0;
			const end = Math.min(content.length, args.end || 16384);

			const links = Array.from(document.querySelectorAll("a")).map((a) => `${a.textContent}: ${a.href}`);
			return `Page web à ${args.url}\n\nLiens sur la page :\n${links.join("\n")}\n\nPlage: ${start}-${end} (total: ${content.length})\nContenu de la page :\n${content.substring(start, end)}`;
		} catch (e) {
			if (process.env.debug == "true") console.log(format(`Navigation failed: ${e} `, "dim", "red"));
			return "Échec de la navigation";
		}
	},
	definition: {
		type: "function",
		function: {
			name: "browse",
			description: "Permet de naviguer sur une page web, de lire son contenu principal et d'extraire les liens.",
			parameters: {
				type: "object",
				properties: {
					url: {
						type: "string",
						description: "L'URL de la page à parcourir."
					},
					start: {
						type: "integer",
						description: "L'index de début de la lecture (défaut: 0)."
					},
					end: {
						type: "integer",
						description: "L'index de fin de la lecture (défaut: 16384)."
					}
				},
				required: ["url"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Navigue vers: ${args.url} ` : "Navigue sur le web"
};

export default tool;