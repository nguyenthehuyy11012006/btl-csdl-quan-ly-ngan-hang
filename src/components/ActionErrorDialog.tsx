import { AlertCircle, CircleCheck, X } from 'lucide-react'

export default function ActionErrorDialog({ message, title, variant = 'error', onClose }: { message: string; title?: string; variant?: 'error' | 'success'; onClose: () => void }) {
  const cleanMessage = message.replace(/^Error invoking remote method ['"][^'"]+['"]:\s*Error:\s*/, '')
  return <div className="action-error-overlay">
    <div className={`action-error-dialog ${variant}`} role={variant === 'error' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="action-status-title" aria-describedby="action-status-message">
      {variant === 'error' ? <AlertCircle size={22} /> : <CircleCheck size={22} />}
      <div><strong id="action-status-title">{title ?? (variant === 'success' ? 'Thao tác thành công' : 'Thao tác chưa thành công')}</strong><span id="action-status-message">{cleanMessage}</span></div>
      <button type="button" aria-label="Đóng thông báo" autoFocus onClick={onClose}><X size={18} /></button>
    </div>
  </div>
}
