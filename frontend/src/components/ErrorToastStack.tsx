type ErrorToast = {
  id: number;
  message: string;
};

type ErrorToastStackProps = {
  toasts: ErrorToast[];
  onDismiss: (id: number) => void;
};

export default function ErrorToastStack({ toasts, onDismiss }: ErrorToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="error-toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="error-toast" role="alert">
          <span className="error-toast-message">{toast.message}</span>
          <button
            type="button"
            className="error-toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
