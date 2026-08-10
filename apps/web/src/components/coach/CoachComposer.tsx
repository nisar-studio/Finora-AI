import { FormEvent, KeyboardEvent, useState } from 'react';
import { Send } from 'lucide-react';

interface CoachComposerProps {
  onSend: (question: string) => void;
  isPending: boolean;
}

export function CoachComposer({ onSend, isPending }: CoachComposerProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const question = value.trim();
    if (!question || isPending) {
      return;
    }
    onSend(question);
    setValue('');
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2 rounded-lg border border-ink/10 bg-surface p-2"
    >
      <textarea
        aria-label="Ask your financial coach a question"
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask Finora about your spending, savings or goals…"
        className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        aria-label="Send question"
        className="inline-flex shrink-0 items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? (
          'Thinking…'
        ) : (
          <>
            Send
            <Send className="size-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}