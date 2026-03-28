import type { StackProps } from "./stack.js";
import type { TextProps } from "./text.js";
import type { ActionProps } from "./action.js";
import type { InputProps } from "./input.js";

/**
 * The contract every render target must satisfy.
 *
 * @nexus/web, @nexus/native, and @nexus/email each implement this interface,
 * ensuring all four primitives are handled before a target can be used.
 *
 * The generic `TNode` is the target's native node type:
 *   - Web    → ReactElement
 *   - Native → ReactElement (react-native)
 *   - Email  → string (MJML/HTML)
 */
export interface NexusRenderer<TNode> {
  Stack: (props: StackProps) => TNode;
  Text: (props: TextProps) => TNode;
  Action: (props: ActionProps) => TNode;
  Input: (props: InputProps) => TNode;
}
