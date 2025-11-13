import { format } from "../lib/format.js";

import config from "../config.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (rl, args, perRequestData) => {
		if (perRequestData.webSearch.requests >= 3) return "Trop de requêtes sur Google. L'outil n'est plus utilisable pour l'instant.";
		else typeof perRequestData.webSearch.requests == "number" ? perRequestData.webSearch.requests++ : perRequestData.webSearch.requests = 1;

		try {
			if (process.env.debug == "true") console.log(format(`Searching on Google: ${args.query}`, "dim"));

			const query = encodeURIComponent(args.query);
			const url = `https://www.googleapis.com/customsearch/v1?key=${config.webSearch.token}&cx=${config.webSearch.cx}&q=${query}&num=10`;

			const response = await fetch(url);
			const data = await response.json();

			if (!data.items || data.items.length == 0) {
				if (process.env.debug == "true") console.log(format(`No results from Google search: ${args.query}`, "dim", "yellow"));
				return "Aucun résultat trouvé pour cette recherche.";
			}

			return `Résultats de la recherche :\n${data.items.map((item) => `${item.title}: ${item.link}`).join("\n")}\nUtilise l'outil 'browse' pour naviguer.`;
		} catch (e) {
			if (process.env.debug == "true") console.log(format(`Failed to search on Google: ${e}`, "dim", "red"));
			return "Failed to search on Google";
		}
	},
	definition: {
		type: "function",
		function: {
			name: "webSearch",
			description: "Recherche des informations sur Google",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "Les termes de la recherche"
					}
				},
				required: ["query"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Recherche "${args.query}" sur Google` : "Recherche sur Google"
};

export default tool;