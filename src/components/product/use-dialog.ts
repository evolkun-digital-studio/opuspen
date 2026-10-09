import { useEffect, useRef } from "react";

/**
 * Drives a native modal <dialog> from React state: showModal() gives focus
 * trapping, Escape and the top layer for free. Enter/exit motion lives in CSS
 * (@starting-style), so closing stays declarative.
 */
export function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return ref;
}
