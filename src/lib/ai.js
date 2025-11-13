import * as arrow from "apache-arrow";
import fs from "fs/promises";
import lancedb from "@lancedb/lancedb";
import { Ollama } from "ollama";
import os from "os";
import path from "path";
import url from "url";
import * as uuid from "uuid";

import { format } from "../lib/format.js";

import config from "../config.js";

class AI extends EventTarget {
	constructor() {
		super();
		this.ollama = new Ollama();

		/** @type {import("ollama").Message[]} */
		this.conversation = [{
			role: "system",
			content: config.prompts.system
		}];

		/** @type {import("ollama").AbortableAsyncIterator?} */
		this.currentStream = null;

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
				768,
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
		const embeddings = await this.ollama.embeddings({
			model: config.models.embeds,
			prompt: text
		});

		await this[options.persistent ? "table" : "sessionTable"].add([{
			id: uuid.v4(),
			text,
			category: metadata.category || null,
			timestamp: Date.now(),
			vector: embeddings.embedding
		}]);
	};

	/**
	 * @param {string} query
	 * @param {object} filters
	 * @param {{from: "session" | "default" | "all"}} options
	 * @returns {Promise<Array<object>>}
	 */
	async search(query, count = 25, filters = {}, options = { from: "all" }) {
		const embeddings = await this.ollama.embeddings({
			model: config.models.embeds,
			prompt: query
		});

		const whereClause = Object.entries(filters)
			.map(([key, value]) => `${key} = '${value}'`)
			.join(" AND ");

		let sessionResults = [];
		if (options.from === "session" || options.from == "all") {
			let search = this.sessionTable.search(embeddings.embedding, "vector");
			if (whereClause) search = search.where(whereClause);
			sessionResults = await search.limit(count).toArray();
		}

		let results = [];
		if (options.from == "default" || options.from == "all") {
			let search = this.table.search(embeddings.embedding, "vector");
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
		if (this.currentStream) {
			this.currentStream.abort();
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

		/** @type {import("../types.d.ts").Response} */
		let fullResponse = {};

		try {
			const response = await this.ollama.chat({
				messages: this.conversation,
				...options,
				stream: true,
				think: "high",
				tools: this.tools.map((tool) => tool.definition)
			});

			this.currentStream = response;

			for await (const part of response) {
				fullResponseContent += part.message.content;
				if (typeof callback == "function") callback(part.message.content);

				if (part.done) {
					fullResponse = part;
					fullResponse.aborted = false;
					fullResponse.message.content = fullResponseContent;

					if (process.env.debug == "true") {
						console.log(format("\n-------------------------", "dim"));
						console.log(format(`Answered in ${(fullResponse.total_duration / 1e9).toFixed(2)}s`, "dim"));
						console.log(format(`In: ${(fullResponse.prompt_eval_count / fullResponse.prompt_eval_duration * 1e9).toFixed(1)}t/s - Out: ${(fullResponse.eval_count / fullResponse.eval_duration * 1e9).toFixed(1)}t/s`, "dim"));
					}
				};
			}

			this.currentStream = null;

			this.conversation.push({
				role: "assistant",
				content: fullResponse.message.content
			});

			if (fullResponse.message.tool_calls?.length > 0) {
				if (process.env.debug == "true") console.log(format(`Calling ${fullResponse.message.tool_calls.length} tool${fullResponse.message.tool_calls.length > 1 ? "s" : ""}.`, "dim"));

				for (const call of fullResponse.message.tool_calls) {
					const tool = this.tools.find((tool) => tool.definition.function.name == call.function.name);

					if (tool) {
						console.log(format(tool.display(call.function.arguments), "dim"));

						this.conversation.push({
							role: "tool",
							tool_name: call.function.name,
							content: await tool.call(options.rl, call.function.arguments, this.perRequestData) + "\nMerci de fournir à l'utilisateur un résumé de l'action du tool ainsi que son résultat de manière simplifiée, sauf demande contraire de l'utilisateur."
						});
					} else {
						if (process.env.debug == "true") console.log(format(`Tool ${call.function.name} does not exist.`, "dim"));
						this.conversation.push({
							role: "tool",
							tool_name: call.function.name,
							content: "This tool doesn't exists"
						});
					}
				}

				if (process.env.debug == "true") process.stdout.write(format("-------------------------", "dim"));

				delete options.prompt;
				return await this.generate(options, callback);
			}

			if (process.env.debug == "true") process.stdout.write(format("-------------------------\n", "dim"));
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
			} else fullResponse.aborted = true;
		}

		return fullResponse;
	};

	abort() {
		if (this.currentStream) {
			this.currentStream.abort();
			this.currentStream = null;
			return true;
		} else return false;
	};

	/** @param {string} name */
	async loadModel(name) {
		await this.ollama.generate({
			model: name,
			keep_alive: -1
		});
	};

	/** @param {string} name */
	async loadEmbedModel(name) {
		await this.ollama.embeddings({
			model: name,
			keep_alive: -1
		});
	};

	/** @param {string} name */
	async unloadModel(name) {
		await this.ollama.generate({
			model: name,
			keep_alive: 0
		});
	};

	/** @param {string} name */
	async unloadEmbedModel(name) {
		await this.ollama.embeddings({
			model: name,
			keep_alive: 0
		});
	};
};

export default new AI();