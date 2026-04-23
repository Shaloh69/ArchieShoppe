import { addToast } from "@heroui/toast";

interface ToastInput {
  title: string;
  description?: string;
}

const BASE_TEXT = {
  title: "text-[#1a0a05] font-semibold text-sm",
  description: "text-[#8a5240] text-xs",
  closeButton: "text-[#c4907e] hover:text-[#1a0a05] transition-colors",
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
      progressTrack: "bg-[#dcfce7]",
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
      progressTrack: "bg-[#fee2e2]",
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
      progressTrack: "bg-[#fff0ec]",
      progressIndicator: "bg-[#ee4d2d]",
    },
  });
