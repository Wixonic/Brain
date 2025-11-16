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
		let memoryResults = await ai.search(input, 5);
		if (memoryResults.length > 0) memoryResults = `Résultats de la recherche mémoire partielle (utiliser l'outil pour en savoir plus) :\n${memoryResults.map((document) => `- Risque: ${document.risk}; Date: ${document.timestamp.toISOString()}; Catégorie: ${document.category ?? "aucune"}; Contenu: ${document.text}`).join("\n")}`;
		else memoryResults = "Aucun résultat de recherche dans la mémoire.";

		if (process.env.debug == "true") console.log(format(`-------------------------\n${memoryResults}\n-------------------------`, "dim"));

		const prompt = `${input}\n\n---\n${memoryResults}`;
		const response = await ai.generate({
			model: config.models.main,
			prompt,
			rl
		}, (chunk) => process.stdout.write(format(chunk, "whiteBright")));

		process.stdout.write("\n");

		rl.prompt();
	});

	rl.on("SIGINT", async () => {
		if (!ai.abort()) rl.close();
	});

	rl.prompt();
};

main();