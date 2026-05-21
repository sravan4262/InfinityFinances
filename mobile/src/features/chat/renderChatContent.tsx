import { Fragment, type ReactNode } from "react";
import { Text } from "react-native";

// Render assistant text as a list of styled <Text> runs — no HTML, no
// markup injection path. Mirrors the web renderChatContent helper.
export function renderChatContent(content: string, color: string): ReactNode {
  const lines = content.split("\n");
  return lines.map((line, lineIdx) => (
    <Fragment key={lineIdx}>
      {renderInline(line, color)}
      {lineIdx < lines.length - 1 ? <Text style={{ color }}>{"\n"}</Text> : null}
    </Fragment>
  ));
}

function renderInline(line: string, color: string): ReactNode[] {
  const parts = line.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <Text key={idx} style={{ color, fontWeight: "900" }}>
        {part}
      </Text>
    ) : (
      <Text key={idx} style={{ color }}>
        {part}
      </Text>
    )
  );
}
