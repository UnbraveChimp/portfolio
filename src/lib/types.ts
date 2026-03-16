import type { CollectionEntry } from "astro:content";

export type ArticleFrontmatter = CollectionEntry<"blog">["data"] & {
	url: string;
};

export type BlogListItem = {
	title: string;
	description: string;
	url: string;
	duration?: string;
	timestamp?: Date;
	image?: string;
	source?: string;
};

export type ProjectFrontmatter = CollectionEntry<"project">["data"] & {
	url: string;
};
