import Parser from "rss-parser";
import type { BlogListItem } from "./types";

const parser = new Parser({
	customFields: {
		item: ["media:content", ["media:content", "mediaContent"]],
	},
});

const EXTERNAL_BLOG_FEED_URL = "https://rss.app/feeds/3loEohVcGbQvIdGa.xml";

export type ExternalBlogItem = BlogListItem;

const stripHtml = (content: string): string => {
	return content
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
};

const getDescriptionFromItem = (item: Parser.Item): string => {
	if (item.contentSnippet?.trim()) return item.contentSnippet.trim();
	if (item.summary?.trim()) return stripHtml(item.summary);
	if (item.content?.trim()) return stripHtml(item.content);
	if (item.title?.trim()) return item.title.trim();
	return "";
};

const isValidUrl = (value: unknown): value is string => {
	if (typeof value !== "string") return false;
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
};

const getImageFromItem = (item: Parser.Item): string | undefined => {
	if (isValidUrl(item.enclosure?.url)) return item.enclosure.url;

	const mappedMediaContent = (item as Parser.Item & {
		mediaContent?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
	}).mediaContent;

	if (Array.isArray(mappedMediaContent)) {
		const mediaImage = mappedMediaContent.find((entry) =>
			isValidUrl(entry?.$?.url),
		);
		if (mediaImage?.$?.url) return mediaImage.$.url;
	}

	if (isValidUrl(mappedMediaContent?.$?.url)) return mappedMediaContent.$.url;

	const mediaContent = (item as Parser.Item & {
		"media:content"?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
	})["media:content"];

	if (Array.isArray(mediaContent)) {
		const mediaImage = mediaContent.find((entry) => isValidUrl(entry?.$?.url));
		return mediaImage?.$?.url;
	}

	if (isValidUrl(mediaContent?.$?.url)) return mediaContent.$.url;

	return undefined;
};

const getSourceFromUrl = (url: string): string | undefined => {
	try {
		const hostname = new URL(url).hostname.toLowerCase();
		if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
			return "From X/Twitter";
		}
		return undefined;
	} catch {
		return undefined;
	}
};

export const getExternalBlogItems = async (): Promise<ExternalBlogItem[]> => {
	try {
		const feed = await parser.parseURL(EXTERNAL_BLOG_FEED_URL);

		return (feed.items ?? [])
			.map((item) => {
				const sourceDate = item.isoDate ?? item.pubDate;
				const timestamp = sourceDate ? new Date(sourceDate) : undefined;

				return {
					title: item.title?.trim() || "Untitled",
					description: getDescriptionFromItem(item),
					url: item.link?.trim() || "",
					image: getImageFromItem(item),
					source: item.link ? getSourceFromUrl(item.link) : undefined,
					timestamp:
						timestamp && !Number.isNaN(timestamp.valueOf())
							? timestamp
							: undefined,
				};
			})
			.filter((item) => item.url.length > 0 && item.title.length > 0);
	} catch (error) {
		console.warn("Failed to load external blog feed:", error);
		return [];
	}
};