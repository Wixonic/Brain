import ai from "../lib/ai.js";
import { format } from "../lib/format.js";

/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async (rl, args) => {
		try {
			await ai.memorize(args.text, { category: args.category });
			return "Mémorisé dans la mémoire avec succès";
		} catch (e) {
			if (process.env.debug == "true") console.log(format(`Failed to memorize: ${e}`, "dim", "red"));
			return "Échec de la mémorisation";
		}
	},
	definition: {
		type: "function",
		function: {
			name: "memorize",
			description: "Utilise cette fonction pour enregistrer et mémoriser de manière permanente une information textuelle fournie par l'utilisateur. Indispensable pour toute demande de mémorisation.",
			parameters: {
				type: "object",
				properties: {
					text: {
						type: "string",
						description: "Le texte ou l'information à mémoriser."
					},
					category: {
						type: "string",
						description: "Catégorie optionnelle pour classer ou organiser l'information mémorisée."
					}
				},
				required: ["text"]
			}
		}
	},
	display: (args) => process.env.debug == "true" ? `Mémorise "${args.text}" dans la mémoire` : "Mémorise des informations"
};

export default tool;