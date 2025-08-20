import ai from "../lib/ai.js";
import { format } from "../lib/format.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (args) => {
		try {
			const results = await ai.search(args.query);
			return `Résultats de la recherche :\n${results.map((document) => `- ${document.text}`).join("\n")}`;
		} catch (e) {
			if (process.env.debug == "true") console.log(format(`Failed to search in memory: ${e}`, "dim", "red"));
			return "Failed to search in memory";
		}
	},
	definition: {
		type: "function",
		function: {
			name: "memorySearch",
			description: "Récupère des informations de la mémoire.",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "La question à laquelle l'utilisateur veut une réponse."
					}
				},
				required: ["query"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Recherche "${args.query}" dans la mémoire` : "Recherche des informations dans la mémoire"
};

export default tool;