import { forwardRef } from 'react';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

// Mantém htmlFor e aria-describedby amarrados sem depender de quem escreve o
// próximo campo lembrar disso.
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ id, label, hint, error, ...inputProps }, ref) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>

        <input
          {...inputProps}
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        />

        {hint && (
          <span className="field__hint" id={hintId}>
            {hint}
          </span>
        )}

        {error && (
          <span className="field__error" id={errorId}>
            {error}
          </span>
        )}
      </div>
    );
  },
);
