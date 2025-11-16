import type * as openai from "openai";

type OpenAIMessage = openai.ChatCompletionMessageParam;

export type Response = (openai.ChatCompletion | {
	message: openai.ChatCompletionMessage;
}) & {
	aborted: boolean;
};

export type Tool = {
	call: (
		rl: import("readline").Interface,
		args: {
			[name: string]: any
		},
		perRequestData: object
	) => Promise<string>,

	definition: openai.FunctionDefinition,
	display: (args: {
		[name: string]: any
	}) => string
};

export type GenerateOptions = Omit<openai.ChatCompletionCreateParams, 'messages' | 'stream'> & {
	prompt: string | undefined;
	rl: import("readline").Interface

	model: string;
};