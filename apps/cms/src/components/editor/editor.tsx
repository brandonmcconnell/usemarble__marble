"use client";

import type { Extension } from "@tiptap/core";
import { EditorContent, EditorRoot, type JSONContent } from "novel";
import { handleCommandNavigation } from "novel/extensions";
import { BubbleMenu } from "./bubble-menu";
import { defaultExtensions } from "./extensions";
import { slashCommand } from "./slash-command-items";
import { SlashCommandMenu } from "./slash-command-menu";

export const extensions = [...defaultExtensions, slashCommand] as Extension[];

interface EditorProps {
  value?: JSONContent;
  onChange: (html: string, json: JSONContent) => void;
  ref?: React.RefObject<HTMLDivElement | null>;
}

export function Editor({ value, onChange }: EditorProps) {
  return (
    <EditorRoot>
      <EditorContent
        editorProps={{
          handleDOMEvents: {
            keydown: (_view, event) => handleCommandNavigation(event),
          },
          attributes: {
            class:
              "prose lg:prose-lg dark:prose-invert min-h-96 sm:px-4 focus:outline-none max-w-full prose-blockquote:border-border",
          },
        }}
        extensions={extensions}
        immediatelyRender={false}
        initialContent={value}
        onUpdate={({ editor }) => {
          const html = editor.getHTML();
          const json = editor.getJSON();
          onChange(html, json);
        }}
      >
        <BubbleMenu />
        <SlashCommandMenu />
      </EditorContent>
    </EditorRoot>
  );
}
