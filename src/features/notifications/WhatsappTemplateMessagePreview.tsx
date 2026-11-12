type Props = {
  message: string;
  className?: string;
};

export function WhatsappTemplateMessagePreview({ message, className = "" }: Props) {
  const text = message.trim() || "(empty template body)";
  return (
    <div className={`max-w-md ${className}`}>
      <p className="text-xs text-zinc-500 mb-2">Message preview</p>
      <div
        className="rounded-lg rounded-tl-sm px-3 py-2 text-sm text-zinc-900 whitespace-pre-wrap shadow-sm"
        style={{ backgroundColor: "#dcf8c6" }}
      >
        {text}
      </div>
    </div>
  );
}
