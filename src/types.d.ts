import * as ollama from "ollama";

export type Response = ollama.ChatResponse & {
	aborted: boolean
};

export type Tool = {
	call: (args: {
		[name: string]: any
	}) => Promise<string>,
	definition: ollama.Tool,
	display: (args: {
		[name: string]: any
	}) => string
};

export type GenerateOptions = ollama.ChatRequest & {
	prompt: string?;
};