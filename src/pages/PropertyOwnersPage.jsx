import { PageRenderer } from "@/components/PageRenderer";

/**
 * Block-driven owners page. Content lives in cms_content row
 * `page:owners` and is fully editable from /admin canvas.
 */
export const PropertyOwnersPage = () => <PageRenderer slug="owners" />;

export default PropertyOwnersPage;
