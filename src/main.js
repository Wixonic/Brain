import os from "os";
import readline from "readline";

import ai from "./lib/ai.js";
import { format } from "./lib/format.js";

import config from "./config.json" with { type: "json" };

const main = async () => {
	if (process.env.debug == "true") console.log(format("Loading database...", "dim"));
	await ai.loadDB();

	if (process.env.debug == "true") console.log(format("Loading tools...", "dim"));
	await ai.loadTools();

	if (process.env.debug == "true") console.log(format("Loading main model...", "dim"));
	await ai.loadModel(config.models.main);

	Promise.all([
		ai.loadEmbedModel(config.models.embeds),
		// ai.loadModel(config.models.vision)
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
		const response = await ai.generate({
			model: config.models.main,
			prompt: input
		}, (chunk) => process.stdout.write(format(chunk, "whiteBright")));

		process.stdout.write("\n");

		rl.prompt();
	});

	rl.on("SIGINT", async () => {
		if (!ai.abort()) {
			await Promise.all([
				ai.unloadModel(config.models.main),
				ai.unloadEmbedModel(config.models.embeds),
				ai.unloadModel(config.models.vision)
			]);

			rl.close();
		}
	});

	rl.prompt();
};

main();