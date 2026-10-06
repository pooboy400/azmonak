import ReactMarkdown from "react-markdown";

/** رندر Markdown محتوای بلاگ (از دیتابیس) با استایل داخلی — بدون نیاز به پلاگین تایپوگرافی */
export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h2: (props) => <h2 className="mb-3 mt-10 text-xl font-bold text-foreground" {...props} />,
        h3: (props) => <h3 className="mb-2 mt-8 text-lg font-bold text-foreground" {...props} />,
        p: (props) => <p className="mb-5 text-[15px] leading-8 text-foreground/85" {...props} />,
        ul: (props) => <ul className="mb-5 list-disc space-y-2 pr-6 text-[15px] leading-8 text-foreground/85" {...props} />,
        ol: (props) => <ol className="mb-5 list-decimal space-y-2 pr-6 text-[15px] leading-8 text-foreground/85" {...props} />,
        strong: (props) => <strong className="font-bold text-foreground" {...props} />,
        blockquote: (props) => (
          <blockquote className="mb-5 border-r-4 border-primary/40 bg-secondary/40 px-5 py-3 text-[15px] leading-8 text-foreground/80" {...props} />
        ),
        a: (props) => <a className="font-medium text-primary underline underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
