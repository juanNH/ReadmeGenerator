import { parseTechnologyIconRow } from "@/core/readme/technology-icons";
import { parseContactIconRow } from "@/core/readme/contact-icons";

type Node = { type: string; value?: string; children?: Node[] };

function isNode(value: unknown): value is Node {
  return (
    typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
  );
}

/** Convert only our exact catalog markup; all other HTML remains skipped. */
export function remarkProfileIcons() {
  return (tree: unknown) => {
    function visit(node: Node) {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.flatMap((child) => {
        if (child.type === "html" && typeof child.value === "string") {
          const entries = parseTechnologyIconRow(child.value) ?? parseContactIconRow(child.value);
          if (entries) {
            const images = entries.flatMap((entry, index) => [
              ...(index > 0 ? [{ type: "text", value: " " }] : []),
              { type: "image", url: entry.iconUrl, alt: "aliases" in entry ? entry.name : "" },
            ]);
            return node.type === "paragraph" || node.type === "link"
              ? images
              : [{ type: "paragraph", children: images }];
          }
        }
        visit(child);
        return [child];
      });
    }
    if (isNode(tree)) visit(tree);
  };
}
