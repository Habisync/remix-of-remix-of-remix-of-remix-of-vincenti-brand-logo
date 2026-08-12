import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSectionsTool from "./tools/list-sections";
import getSectionTool from "./tools/get-section";
import updateSectionTool from "./tools/update-section";
import toggleSectionTool from "./tools/toggle-section";
import listListingsTool from "./tools/list-listings";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "remix-of-remix-of-remix-of-remix-of-vincenti-brand-logo",
  title: "Remix of Remix of Remix of Remix of Vincenti Brand Logo",
  version: "0.1.0",
  instructions:
    "Tools for the Christiano Property Management site. Read and edit CMS sections and pages (JSON block content), toggle section visibility, and browse live Guesty rental listings. Section keys prefixed 'page:' hold full page block arrays.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listSectionsTool,
    getSectionTool,
    updateSectionTool,
    toggleSectionTool,
    listListingsTool,
  ],
});
