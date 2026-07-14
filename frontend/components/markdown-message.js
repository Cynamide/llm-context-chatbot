import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(" ")
}

export function MarkdownMessage({ content }) {
  return React.createElement(
    "div",
    {
      className:
        "text-sm leading-relaxed text-inherit [&_p]:m-0 [&_p+p]:mt-3 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:mb-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_table]:block [&_table]:overflow-x-auto [&_table]:my-3 [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
    },
    React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      components: {
        a({ className, ...props }) {
          return React.createElement("a", {
            ...props,
            target: "_blank",
            rel: "noreferrer noopener",
            className: joinClassNames(className),
          })
        },
        code({ inline, className, children, ...props }) {
          if (inline) {
            return React.createElement(
              "code",
              {
                ...props,
                className: "rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground",
              },
              children,
            )
          }

          return React.createElement(
            "code",
            {
              ...props,
              className: joinClassNames(
                "block overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground",
                className,
              ),
            },
            children,
          )
        },
        pre({ children }) {
          return React.createElement("pre", { className: "my-3 overflow-x-auto rounded-md bg-muted p-0" }, children)
        },
        ul({ className, ...props }) {
          return React.createElement("ul", {
            ...props,
            className: joinClassNames("list-disc pl-5", className),
          })
        },
        ol({ className, ...props }) {
          return React.createElement("ol", {
            ...props,
            className: joinClassNames("list-decimal pl-5", className),
          })
        },
        blockquote({ className, ...props }) {
          return React.createElement("blockquote", {
            ...props,
            className: joinClassNames("italic", className),
          })
        },
      },
      children: content,
    }),
  )
}
