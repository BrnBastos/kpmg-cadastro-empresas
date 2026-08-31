interface AlertProps {
  variant: 'error' | 'success' | 'warning';
  children: React.ReactNode;
}

export function Alert({ variant, children }: AlertProps) {
  return (
    <div
      className={`alert alert--${variant}`}
      // Erro interrompe a leitura de tela; aviso e sucesso apenas anunciam.
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span>{children}</span>
    </div>
  );
}
