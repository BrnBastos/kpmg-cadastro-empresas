interface AlertProps {
  variant: 'error' | 'success';
  children: React.ReactNode;
}

export function Alert({ variant, children }: AlertProps) {
  return (
    <div
      className={`alert alert--${variant}`}
      // erro precisa interromper a leitura de tela, aviso de sucesso nao
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span>{children}</span>
    </div>
  );
}
