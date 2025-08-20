import ai from "../lib/ai.js";
import { format } from "../lib/format.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (args) => {
		try {
			await ai.memorize(args.text);
			return "Mémorisé avec succès";
		} catch (e) {
			if (process.env.debug == "true") console.log(format(`Failed to memorize: ${e}`, "dim", "red"));
			return "Échec de la mémorisation";
		}
	},
	definition: {
		type: "function",
		function: {
			name: "memorize",
			description: "Mémorise une note ou un fait.",
			parameters: {
				type: "object",
				properties: {
					text: {
						type: "string",
						description: "La note complète à mémoriser, contenant tous les détails, mais synthétique."
					}
				},
				required: ["text"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Mémorise "${args.text}" dans la mémoire` : "Mémorise des informations"
};

export default tool;