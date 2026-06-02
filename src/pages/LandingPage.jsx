import { PageRenderer } from "@/components/PageRenderer";

/**
 * Block-driven landing page. Content lives in cms_content row
 * `page:home` and is fully editable from /admin canvas.
 */
export const LandingPage = () => <PageRenderer slug="home" />;

export default LandingPage;
