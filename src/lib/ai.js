import * as arrow from "apache-arrow";
import fs from "fs/promises";
import lancedb from "@lancedb/lancedb";
import { OpenAI } from "openai";
import os from "os";
import path from "path";
import url from "url";
import * as uuid from "uuid";

import { format } from "../lib/format.js";

import config from "../config.js";

class AI extends EventTarget {
	constructor() {
		super();
		this.client = new OpenAI({
			apiKey: "no-api-key-required",
			baseURL: "http://localhost:1234/v1"
		});

		/** @type {import("openai/resources/index.js").ChatCompletionMessageParam[]} */
		this.conversation = [{
			role: "system",
			content: config.prompts.system
		}];

		/** @type {AbortController | null} */
		this.currentStreamController = null;

		/** @type {import("../types.d.ts").Tool[]} */
		this.tools = [];

		/** @type {import("@lancedb/lancedb").Connection?} */
		this.db = null;

		this.generateNewRequestData();
	};

	generateNewRequestData() {
		this.perRequestData = {};
		for (const tool of this.tools) this.perRequestData[tool.definition.function.name] = {};
	};

	async loadDB() {
		this.db = await lancedb.connect(path.join(os.homedir(), "Brain"));

		try {
			await this.db.dropTable("session_memory");
		} catch (error) {
			if (!error.message.includes("was not found")) throw error;
		}

		const schema = new arrow.Schema([
			new arrow.Field("id", new arrow.Utf8(), false),
			new arrow.Field("vector", new arrow.FixedSizeList(
				192,
				new arrow.Field("item", new arrow.Float32())
			), false),
			new arrow.Field("timestamp", new arrow.TimestampMillisecond(), false),
			new arrow.Field("category", new arrow.Utf8(), true),
			new arrow.Field("text", new arrow.Utf8(), false)
		]);

		this.sessionTable = await this.db.createEmptyTable("session_memory", schema);

		await this.memorize(`Current date: ${new Date().toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric"
		})}`, undefined, { persistent: false });
		await this.memorize(`Path to user directory: ${os.homedir()}`, undefined, { persistent: false });
		await this.memorize(`Path to user iCloud Drive directory: ${path.join(os.homedir(), "/Library/Mobile Documents/com~apple~CloudDocs/")}`, undefined, { persistent: false });

		try {
			this.table = await this.db.openTable("memory");
		} catch (error) {
			if (error.message = "Table 'memory' was not found") {
				this.table = await this.db.createEmptyTable("memory", schema);
			}
		}
	};

	async loadTools() {
		const __filename = url.fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const toolsPath = path.join(__dirname, "..", "tools");

		const files = await fs.readdir(toolsPath);

		for (const file of files) {
			if (file.endsWith(".js")) {
				const toolModule = await import(`file://${path.join(toolsPath, file)}`);
				/** @type {import("../types.d.ts").Tool} */
				const tool = toolModule.default;

				if (process.env.debug == "true") console.log(format(`Tool "${tool.definition.function.name}" loaded`));

				this.tools.push(tool);
			}
		}
	};

	/**
	 * @param {string} text
	 * @param {{category: string}} metadata
	 * @param {{persistent: boolean}} options
	 * @returns {Promise<void>}
	 */
	async memorize(text, metadata = {}, options = { persistent: true }) {
		const response = await this.client.embeddings.create({
			model: config.models.embeds,
			input: text
		});

		const embeddings = response.data[0].embedding;

		await this[options.persistent ? "table" : "sessionTable"].add([{
			id: uuid.v4(),
			text,
			category: metadata.category || null,
			timestamp: Date.now(),
			vector: embeddings
		}]);
	};

	/**
	 * @param {string} query
	 * @param {object} filters
	 * @param {{from: "session" | "default" | "all"}} options
	 * @returns {Promise<Array<object>>}
	 */
	async search(query, count = 25, filters = {}, options = { from: "all" }) {
		const response = await this.client.embeddings.create({
			model: config.models.embeds,
			input: query
		});

		const embeddings = response.data[0].embedding;

		const whereClause = Object.entries(filters)
			.map(([key, value]) => `${key} = '${value}'`)
			.join(" AND ");

		let sessionResults = [];
		if (options.from === "session" || options.from == "all") {
			let search = this.sessionTable.search(embeddings, "vector");
			if (whereClause) search = search.where(whereClause);
			sessionResults = await search.limit(count).toArray();
		}

		let results = [];
		if (options.from == "default" || options.from == "all") {
			let search = this.table.search(embeddings, "vector");
			if (whereClause) search = search.where(whereClause);
			results = await search.limit(count).toArray();
		}

		const allResults = [...sessionResults, ...results];
		allResults.sort((a, b) => a._distance - b._distance);

		const finalResults = allResults.slice(0, count);

		return finalResults.map((result) => ({
			text: result.text,
			category: result.category,
			timestamp: new Date(result.timestamp),
			risk: `${Math.floor(result._distance * 1000)}`
		}));
	};

	/**
	 * @param {import("../types.d.ts").GenerateOptions} options
	 * @param {(chunk: string) => any} callback
	 * @returns {Promise<import("../types.d.ts").Response>}
	 */
	async generate(options, callback) {
		if (this.currentStreamController) {
			this.currentStreamController.abort();
			if (process.env.debug == "true") process.stdout.write(format("\nAborted previous prompt.", "dim"));
		}

		if (options.prompt) {
			this.generateNewRequestData();
			this.conversation.push({
				role: "user",
				content: options.prompt
			});
		} else if (process.env.debug == "true") process.stdout.write(format("\nGenerating without user prompt.\n", "dim"));

		let fullResponseContent = "";
		let toolCalls = [];

		/** @type {import("../types.d.ts").Response} */
		let fullResponse = {};

		const controller = new AbortController();
		this.currentStreamController = controller;

		try {
			const responseStream = await this.client.chat.completions.create({
				model: options.model,
				messages: this.conversation,
				stream: true,
				temperature: options.temperature,
				stop: options.stop,
				tools: this.tools.map((tool) => tool.definition),
				signal: controller.signal
			});

			for await (const part of responseStream) {
				const delta = part.choices[0].delta;
				if (delta.content) {
					fullResponseContent += delta.content;
					if (typeof callback == "function") callback(delta.content);
				}
				if (delta.tool_calls) {
					// Logic to aggregate tool calls from stream chunks
					for (const tool_call_chunk of delta.tool_calls) {
						if (toolCalls[tool_call_chunk.index]) {
							toolCalls[tool_call_chunk.index].function.arguments += tool_call_chunk.function.arguments;
						} else {
							toolCalls[tool_call_chunk.index] = tool_call_chunk;
						}
					}
				}
			}

			this.currentStreamController = null;

			// Fallback to non-streaming if content is empty but tool calls might exist
			if (!fullResponseContent && (toolCalls.length > 0 || this.conversation.length > 0 && this.conversation[this.conversation.length - 1].role === 'user')) {
				const finalResponse = await this.client.chat.completions.create({
					model: options.model,
					messages: this.conversation,
					stream: false,
					temperature: options.temperature,
					stop: options.stop,
					tools: this.tools.map((tool) => tool.definition),
				});

				fullResponse = {
					message: finalResponse.choices[0].message,
					aborted: false
				};
				fullResponseContent = fullResponse.message.content || "";
				toolCalls = fullResponse.message.tool_calls || [];

			} else {
				fullResponse = {
					message: {
						role: "assistant",
						content: fullResponseContent,
						tool_calls: toolCalls
					},
					aborted: false
				};
			}

			this.conversation.push(fullResponse.message);

			if (fullResponse.message.tool_calls?.length > 0) {
				if (process.env.debug == "true") console.log(format(`Calling ${fullResponse.message.tool_calls.length} tool${fullResponse.message.tool_calls.length > 1 ? "s" : ""}.`, "dim"));

				for (const call of fullResponse.message.tool_calls) {
					const tool = this.tools.find((tool) => tool.definition.function.name == call.function.name);

					if (tool) {
						console.log(format(tool.display(JSON.parse(call.function.arguments)), "dim"));

						const toolResult = await tool.call(options.rl, JSON.parse(call.function.arguments), this.perRequestData);

						this.conversation.push({
							role: "tool",
							tool_call_id: call.id,
							content: toolResult + "\nMerci de fournir à l'utilisateur un résumé de l'action du tool ainsi que son résultat de manière simplifiée, sauf demande contraire de l'utilisateur."
						});
					} else {
						if (process.env.debug == "true") console.log(format(`Tool ${call.function.name} does not exist.`, "dim"));
						this.conversation.push({
							role: "tool",
							tool_call_id: call.id,
							content: "This tool doesn't exist"
						});
					}
				}

				if (process.env.debug == "true") process.stdout.write(format("-------------------------", "dim"));

				delete options.prompt;
				return await this.generate(options, callback);
			}
		} catch (error) {
			if (error.name != "AbortError") {
				if (process.env.debug == "true") console.log(format(`Failed to respond to user: ${error}`, "dim", "yellow"));
				else console.log(format("Failed to respond, retrying...", "dim", "yellow"));

				this.conversation.push({
					role: "assistant",
					content: `Failed to respond to user: ${error}`
				}, {
					role: "user",
					content: "Réessaye"
				});

				return await this.generate(options, callback);
			} else {
				fullResponse = { ...fullResponse, aborted: true };
			}
		}

		return fullResponse;
	};

	abort() {
		if (this.currentStreamController) {
			this.currentStreamController.abort();
			this.currentStreamController = null;
			return true;
		} else return false;
	};
};

export default new AI();