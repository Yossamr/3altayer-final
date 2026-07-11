import { useLanguage } from "../services/LanguageContext";
import React from 'react';
import { OrderStatus } from '../types';
export const StatusBadge: React.FC<{
  status: OrderStatus;
}> = ({
  status
}) => {
  const {
    t
  } = useLanguage();
  const styles: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: "bg-yellow-100 text-yellow-800 border-yellow-200",
    [OrderStatus.ACCEPTED]: "bg-blue-100 text-blue-800 border-blue-200",
    [OrderStatus.RECEIPT_PAID]: "bg-purple-100 text-purple-800 border-purple-200",
    [OrderStatus.WAITING_PREP]: "bg-indigo-100 text-indigo-800 border-indigo-200",
    [OrderStatus.PICKED_UP]: "bg-orange-100 text-orange-800 border-orange-200",
    [OrderStatus.ON_THE_WAY]: "bg-cyan-100 text-cyan-800 border-cyan-200 animate-pulse",
    [OrderStatus.DELIVERED]: "bg-green-100 text-green-800 border-green-200",
    [OrderStatus.RETURNED]: "bg-red-100 text-red-800 border-red-200",
    [OrderStatus.CANCELLED]: "bg-gray-200 text-gray-600 border-gray-300"
  };
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: t("ar_all_1030"),
    [OrderStatus.ACCEPTED]: t("ar_all_1031"),
    [OrderStatus.RECEIPT_PAID]: t("ar_all_1032"),
    [OrderStatus.WAITING_PREP]: t("ar_all_1033"),
    [OrderStatus.PICKED_UP]: t("ar_all_1034"),
    [OrderStatus.ON_THE_WAY]: t("ar_all_1035"),
    [OrderStatus.DELIVERED]: t("ar_all_1036"),
    [OrderStatus.RETURNED]: t("ar_all_1037"),
    [OrderStatus.CANCELLED]: t("ar_all_1038")
  };
  return <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>;
};