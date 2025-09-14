import os from "os";
import readline from "readline";

import ai from "./lib/ai.js";
import { format } from "./lib/format.js";

import config from "./config.js";

const main = async () => {
	if (process.env.debug == "true") console.log(format("Loading database...", "dim"));
	await ai.loadDB();

	if (process.env.debug == "true") console.log(format("Loading tools...", "dim"));
	await ai.loadTools();

	if (process.env.debug == "true") console.log(format("Loading main model...", "dim"));
	await ai.loadModel(config.models.main);

	Promise.all([
		ai.loadEmbedModel(config.models.embeds)
	]);

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	const welcomeMessage = `Bonjour, ${os.userInfo().username}`;
	ai.conversation.push({
		role: "assistant",
		content: welcomeMessage
	});
	console.log(format(welcomeMessage, "brightWhite"));

	rl.on("line", async (input) => {
		let memoryResults = await ai.search(input);
		if (memoryResults.length > 0) memoryResults = `Résultats de la recherche mémoire :\n${memoryResults.map((document) => `- Pertinence: ${document._distance}, Contenu: ${document.text}`).join("\n")}`;
		else memoryResults = "Aucun résultat de recherche dans la mémoire.";

		if (process.env.debug == "true") console.log(format(`-------------------------\n${memoryResults}`, "dim"));

		const prompt = `${input}\n\n---\n${memoryResults}`;
		const response = await ai.generate({
			model: config.models.main,
			prompt
		}, (chunk) => process.stdout.write(format(chunk, "whiteBright")));

		process.stdout.write("\n");

		rl.prompt();
	});

	rl.on("SIGINT", async () => {
		if (!ai.abort()) {
			await Promise.all([
				ai.unloadModel(config.models.main),
				ai.unloadEmbedModel(config.models.embeds),
				// ai.unloadModel(config.models.vision)
			]);

			rl.close();
		}
	});

	rl.prompt();
};

main();