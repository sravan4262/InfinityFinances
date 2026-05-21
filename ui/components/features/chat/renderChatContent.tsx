import { Fragment, type ReactNode } from "react";

// Render plain assistant text safely: escape every character we don't
// recognize, then convert **bold** and \n into structured React nodes.
// This replaces the old dangerouslySetInnerHTML path so untrusted model
// output can never inject markup.
export function renderChatContent(content: string): ReactNode {
  const lines = content.split("\n");
  return lines.map((line, lineIdx) => (
    <Fragment key={lineIdx}>
      {renderInline(line)}
      {lineIdx < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function renderInline(line: string): ReactNode[] {
  // Split on **bold** runs. Even indices are plain text, odd are bold.
  const parts = line.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? <strong key={idx}>{part}</strong> : <Fragment key={idx}>{part}</Fragment>
  );
}
