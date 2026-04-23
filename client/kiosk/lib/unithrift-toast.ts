import { addToast } from "@heroui/toast";

interface ToastInput {
  title: string;
  description?: string;
}

const BASE_TEXT = {
  title: "text-[#e2f8fb] font-semibold text-sm",
  description: "text-[#67e8f9] text-xs",
  closeButton: "text-[#67e8f9] hover:text-[#e2f8fb] transition-colors",
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
      progressTrack: "bg-[#052e16]",
      progressIndicator: "bg-[#22c55e]",
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
      progressTrack: "bg-[#3b0000]",
      progressIndicator: "bg-[#ef4444]",
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
      progressTrack: "bg-[#004d5e]",
      progressIndicator: "bg-[#06b6d4]",
    },
  });
