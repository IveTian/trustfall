import '../richtext.css';
import * as stylex from '@stylexjs/stylex';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { type FormEvent, useEffect, useState } from 'react';
import { Markdown } from 'tiptap-markdown';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Button } from './Button.tsx';
import { Icon } from './Icon.tsx';

/**
 * A message editor with a deliberately short vocabulary: bold, italic, inline
 * code, links, both lists, a code block, a quote. Everything else — headings,
 * images, tables — stays out; an incident update is a paragraph, not a page.
 *
 * The document reads and writes as markdown. `name` puts the current markdown
 * into the surrounding form as a hidden field; emptiness is the caller's to
 * enforce (check the field before submitting).
 */
export function RichTextEditor({
  id,
  name,
  defaultValue = '',
  disabled = false,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
        },
      }),
      Markdown.configure({ html: false }),
    ],
    content: defaultValue,
    editable: !disabled,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: 'tf-prose',
      },
    },
    onUpdate: ({ editor: current }) => {
      // tiptap-markdown registers its storage untyped; the shape is stable.
      const storage = current.storage as unknown as {
        markdown: { getMarkdown: () => string };
      };
      setValue(storage.markdown.getMarkdown());
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold') ?? false,
      italic: current?.isActive('italic') ?? false,
      code: current?.isActive('code') ?? false,
      link: current?.isActive('link') ?? false,
      bulletList: current?.isActive('bulletList') ?? false,
      orderedList: current?.isActive('orderedList') ?? false,
      codeBlock: current?.isActive('codeBlock') ?? false,
      blockquote: current?.isActive('blockquote') ?? false,
    }),
  });

  function toggleLink() {
    if (!editor) {
      return;
    }
    if (active?.link) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    setLinkUrl('');
    setLinkOpen(true);
  }

  function applyLink(event: FormEvent) {
    // Inside the surrounding incident form: this must never submit it.
    event.preventDefault();
    event.stopPropagation();
    const href = linkUrl.trim();
    if (editor && href) {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  const tools = [
    {
      key: 'bold',
      icon: 'bold',
      label: 'Bold',
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      icon: 'italic',
      label: 'Italic',
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      key: 'code',
      icon: 'code',
      label: 'Inline code',
      run: () => editor?.chain().focus().toggleCode().run(),
    },
    { key: 'link', icon: 'link', label: 'Link', run: toggleLink },
    {
      key: 'bulletList',
      icon: 'list-bullets',
      label: 'Bullet list',
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'orderedList',
      icon: 'list-numbered',
      label: 'Numbered list',
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      key: 'codeBlock',
      icon: 'code-block',
      label: 'Code block',
      run: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
    {
      key: 'blockquote',
      icon: 'quote',
      label: 'Quote',
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
  ] as const;

  return (
    <div {...stylex.props(styles.frame, disabled && styles.frameDisabled)}>
      <div role="toolbar" aria-label="Formatting" {...stylex.props(styles.toolbar)}>
        {tools.map((tool) => (
          <button
            key={tool.key}
            type="button"
            aria-label={tool.label}
            aria-pressed={active?.[tool.key] ?? false}
            disabled={disabled}
            onClick={tool.run}
            {...stylex.props(styles.tool, (active?.[tool.key] ?? false) && styles.toolActive)}
          >
            <Icon name={tool.icon} size={16} />
          </button>
        ))}
      </div>
      {linkOpen ? (
        <div {...stylex.props(styles.linkBar)}>
          <input
            // Opened by an explicit toolbar action; focus follows the intent.
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            type="url"
            placeholder="https://example.com"
            aria-label="Link URL"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                applyLink(event);
              }
              if (event.key === 'Escape') {
                setLinkOpen(false);
              }
            }}
            {...stylex.props(styles.linkInput)}
          />
          <Button variant="secondary" size="sm" onClick={applyLink}>
            Add link
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLinkOpen(false)}>
            Cancel
          </Button>
        </div>
      ) : null}
      <EditorContent editor={editor} {...stylex.props(styles.content)} />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

const styles = stylex.create({
  // Mirrors the Field control: raised ground, hairline edge, an inner accent
  // ring while the caret is inside.
  frame: {
    backgroundColor: color.surfaceRaised,
    borderColor: {
      default: color.border,
      ':hover': color.borderStrong,
      ':focus-within': color.accent,
    },
    borderRadius: radius.sm,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxShadow: {
      default: 'none',
      ':focus-within': `inset 0 0 0 ${mesh.line} ${color.accent}`,
    },
    boxSizing: 'border-box',
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'border-color, box-shadow',
    transitionTimingFunction: motion.ease,
    width: '100%',
  },
  frameDisabled: {
    opacity: 0.55,
  },
  toolbar: {
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: mesh.line,
    display: 'flex',
    flexWrap: 'wrap',
    gap: space[1],
    paddingBlock: space[1],
    paddingInline: space[1],
  },
  tool: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': color.surfaceSubtle,
    },
    borderRadius: radius.sm,
    borderWidth: 0,
    blockSize: control.heightSm,
    color: {
      default: color.textMuted,
      ':hover': color.textPrimary,
    },
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    display: 'flex',
    inlineSize: control.heightSm,
    justifyContent: 'center',
    outlineColor: {
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      ':focus-visible': `calc(${control.focusOffset} * -1)`,
    },
    outlineStyle: {
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      ':focus-visible': control.focusWidth,
    },
    padding: 0,
  },
  toolActive: {
    backgroundColor: {
      default: color.accentMuted,
      ':hover': color.accentMuted,
    },
    color: {
      default: color.accent,
      ':hover': color.accent,
    },
  },
  linkBar: {
    alignItems: 'center',
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: mesh.line,
    display: 'flex',
    gap: space[2],
    paddingBlock: space[1],
    paddingInline: space[2],
  },
  linkInput: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: color.textPrimary,
    flexGrow: 1,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
    minWidth: 0,
    outlineStyle: 'none',
    paddingBlock: space[1],
    paddingInline: space[1],
  },
  // The editable area itself: EditorContent wraps the ProseMirror root, so
  // the padding rides on the wrapper and the min-height keeps a short
  // message from feeling cramped.
  content: {
    cursor: 'text',
    fontSize: text.sizeBody,
    lineHeight: text.lineBody,
    minHeight: space[8],
    paddingBlock: space[2],
    paddingInline: space[3],
  },
});
