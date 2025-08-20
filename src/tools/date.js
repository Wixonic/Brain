/** @type {import("../types.d.ts").Tool} */
const tool = {
	call: async () => `Nous sommes le ${new Date().toLocaleDateString()}`,
	definition: {
		type: "function",
		function: {
			name: "date",
			description: "Récupère la date d'aujourd'hui."
		}
	},
	display: () => "Lit la date"
};

export default tool;