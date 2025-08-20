import { format } from "../lib/format.js";

import config from "../config.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (args) => {
		try {
			if (process.env.debug == "true") console.log(format(`Searching on Google: ${args.query}`, "dim"));

			const query = encodeURIComponent(args.query);
			const url = `https://www.googleapis.com/customsearch/v1?key=${config.webSearch.token}&cx=${config.webSearch.cx}&q=${query}`;

			const response = await fetch(url);
			const data = await response.json();

			if (!data.items || data.items.length == 0) {
				if (process.env.debug == "true") console.log(format(`No results from Google search: ${args.query}`, "dim", "yellow"));
				return "Aucun résultat trouvé pour cette recherche.";
			}

			return `Résultats de la recherche :\n${data.items.map((item) => `Titre: ${item.title}\nLien: ${item.link}\nExtrait: ${item.snippet}\n---`).join("\n")}`;
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