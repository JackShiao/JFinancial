import { useToastStore } from '../../store/toastStore'

const ICON_MAP = {
  success: 'bi-check-circle-fill',
  danger: 'bi-exclamation-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
}

const BG_MAP = {
  success: 'text-bg-success',
  danger: 'text-bg-danger',
  warning: 'text-bg-warning',
  info: 'text-bg-info',
}

function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="position-fixed bottom-0 end-0 p-3"
      style={{ zIndex: 9999 }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast show align-items-center border-0 mb-2 ${BG_MAP[toast.type] ?? 'text-bg-secondary'}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="d-flex">
            <div className="toast-body d-flex align-items-center gap-2">
              <i className={`bi ${ICON_MAP[toast.type] ?? 'bi-bell-fill'}`} aria-hidden="true" />
              {toast.message}
            </div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              aria-label="關閉"
              onClick={() => removeToast(toast.id)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
