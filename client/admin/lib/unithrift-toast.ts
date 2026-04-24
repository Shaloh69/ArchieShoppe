import { addToast } from "@heroui/toast";

interface ToastInput {
  title: string;
  description?: string;
}

export const notifySuccess = ({ title, description }: ToastInput) =>
  addToast({
    title,
    description,
    color: "success",
    variant: "flat",
    timeout: 3200,
    shouldShowTimeoutProgress: true,
  });

export const notifyError = ({ title, description }: ToastInput) =>
  addToast({
    title,
    description,
    color: "danger",
    variant: "flat",
    timeout: 4500,
    shouldShowTimeoutProgress: true,
  });

export const notifyInfo = ({ title, description }: ToastInput) =>
  addToast({
    title,
    description,
    color: "primary",
    variant: "flat",
    timeout: 3500,
    shouldShowTimeoutProgress: true,
  });
