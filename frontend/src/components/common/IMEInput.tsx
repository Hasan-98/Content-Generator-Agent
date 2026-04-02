import { useRef, useCallback, useEffect, forwardRef } from 'react';

interface IMEInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

interface IMETextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * Input that handles Japanese IME composition correctly.
 * Uses uncontrolled input during composition to prevent character duplication.
 */
export const IMEInput = forwardRef<HTMLInputElement, IMEInputProps>(
  function IMEInput({ value, onValueChange, ...props }, forwardedRef) {
    const innerRef = useRef<HTMLInputElement>(null);
    const composingRef = useRef(false);

    const ref = (forwardedRef as React.RefObject<HTMLInputElement>) || innerRef;

    useEffect(() => {
      const el = typeof ref === 'object' && ref ? ref.current : null;
      if (el && !composingRef.current && el.value !== value) {
        el.value = value;
      }
    }, [value, ref]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (!composingRef.current) {
        onValueChange(e.target.value);
      }
    }, [onValueChange]);

    const handleCompositionStart = useCallback(() => {
      composingRef.current = true;
    }, []);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false;
      onValueChange(e.currentTarget.value);
    }, [onValueChange]);

    return (
      <input
        ref={ref}
        defaultValue={value}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        {...props}
      />
    );
  }
);

/**
 * Textarea that handles Japanese IME composition correctly.
 */
export const IMETextarea = forwardRef<HTMLTextAreaElement, IMETextareaProps>(
  function IMETextarea({ value, onValueChange, ...props }, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    const composingRef = useRef(false);

    const ref = (forwardedRef as React.RefObject<HTMLTextAreaElement>) || innerRef;

    useEffect(() => {
      const el = typeof ref === 'object' && ref ? ref.current : null;
      if (el && !composingRef.current && el.value !== value) {
        el.value = value;
      }
    }, [value, ref]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!composingRef.current) {
        onValueChange(e.target.value);
      }
    }, [onValueChange]);

    const handleCompositionStart = useCallback(() => {
      composingRef.current = true;
    }, []);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
      composingRef.current = false;
      onValueChange(e.currentTarget.value);
    }, [onValueChange]);

    return (
      <textarea
        ref={ref}
        defaultValue={value}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        {...props}
      />
    );
  }
);
