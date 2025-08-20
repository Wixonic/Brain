import formats from "./colors.json" with { type: "json" };

export const format = (text, ...options) => {
	const codes = options.map((option) => {
		if (formats.colors.fg[option]) return formats.colors.fg[option];
		else if (option.startsWith("bg.")) {
			option = option.replace("bg.", "");
			if (formats.colors.bg[option]) return formats.colors.bg[option];
		} else if (formats.styles[option]) return formats.styles[option];
		return null;
	}).filter((code) => code != null);

	return `\x1b[${codes.join(",")}m${text}\x1b[${formats.styles.reset}m`;
};