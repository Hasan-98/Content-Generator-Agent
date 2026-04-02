import { useState, useRef, useCallback } from 'react';

/**
 * Hook to handle IME (Input Method Editor) composition correctly.
 * Prevents Japanese text duplication during IME input.
 *
 * Usage:
 *   const { value, onChange, onCompositionStart, onCompositionEnd } = useIMEInput(initialValue, onCommit);
 *   <input value={value} onChange={onChange} onCompositionStart={onCompositionStart} onCompositionEnd={onCompositionEnd} />
 */
export function useIMEInput(
  externalValue: string,
  onCommit: (value: string) => void
) {
  const [localValue, setLocalValue] = useState(externalValue);
  const composingRef = useRef(false);

  // Keep local value in sync with external value when not composing
  if (!composingRef.current && localValue !== externalValue) {
    setLocalValue(externalValue);
  }

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    if (!composingRef.current) {
      onCommit(e.target.value);
    }
  }, [onCommit]);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    composingRef.current = false;
    const val = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
    setLocalValue(val);
    onCommit(val);
  }, [onCommit]);

  return { value: localValue, onChange, onCompositionStart, onCompositionEnd };
}
