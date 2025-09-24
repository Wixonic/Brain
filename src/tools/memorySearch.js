import ai from "../lib/ai.js";
import { format } from "../lib/format.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (args) => {
		try {
			let results = await ai.search(args.query, undefined, { category: args.category });
			if (results.length > 0) results = `Résultats de la recherche mémoire :\n${results.map((document) => `- Pertinence: ${document.score}; Date: ${document.timestamp.toISOString()}; Catégorie: ${document.category ?? "aucune"}; Contenu: ${document.text}`).join("\n")}`;
			else results = "Aucun résultat de recherche dans la mémoire.";
			if (process.env.debug == "true") console.log(format(`-------------------------\n${results}\n-------------------------`, "dim"));
			return results;
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
					},
					category: {
						type: "string",
						description: "Filtre optionnel pour restreindre la recherche à une catégorie spécifique."
					}
				},
				required: ["query"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Recherche "${args.query}" dans la mémoire` : "Recherche des informations dans la mémoire"
};

export default tool;