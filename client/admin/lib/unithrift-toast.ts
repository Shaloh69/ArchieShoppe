import { addToast } from "@heroui/toast";

interface ToastInput {
  title: string;
  description?: string;
}

const BASE_TEXT = {
  title: "text-[#0f172a] font-semibold text-sm",
  description: "text-[#64748b] text-xs",
  closeButton: "text-[#94a3b8] hover:text-[#0f172a] transition-colors",
};

export const notifySuccess = ({ title, description }: ToastInput) =>
  addToast({
    title,
    description,
    timeout: 3200,
    shouldShowTimeoutProgress: true,
    classNames: {
      base: "uni-toast uni-toast-success",
      title: BASE_TEXT.title,
      description: BASE_TEXT.description,
      closeButton: BASE_TEXT.closeButton,
      progressTrack: "bg-[#bbf7d0]",
      progressIndicator: "bg-[#16a34a]",
    },
  });

export const notifyError = ({ title, description }: ToastInput) =>
  addToast({
    title,
    description,
    timeout: 4500,
    shouldShowTimeoutProgress: true,
    classNames: {
      base: "uni-toast uni-toast-error",
      title: BASE_TEXT.title,
      description: BASE_TEXT.description,
      closeButton: BASE_TEXT.closeButton,
      progressTrack: "bg-[#fecaca]",
      progressIndicator: "bg-[#dc2626]",
    },
  });

export const notifyInfo = ({ title, description }: ToastInput) =>
  addToast({
    title,
    description,
    timeout: 3500,
    shouldShowTimeoutProgress: true,
    classNames: {
      base: "uni-toast uni-toast-info",
      title: BASE_TEXT.title,
      description: BASE_TEXT.description,
      closeButton: BASE_TEXT.closeButton,
      progressTrack: "bg-[#dbeafe]",
      progressIndicator: "bg-[#3b82f6]",
    },
  });
