import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ValidationResult, ValidationSummary, ValidationType, ValidationCategory } from "@/types";
import { useEmployeeStore } from "./employeeStore";
import { useSalaryStore } from "./salaryStore";
import { useRatioStore } from "./ratioStore";

interface ValidationState {
  validationResults: ValidationResult[];
  isRunning: boolean;
  runValidation: () => Promise<void>;
  updateResolution: (id: string, resolution: string) => void;
  markResolved: (id: string) => void;
  getSummary: () => ValidationSummary;
  getResultsByMonth: (month: string) => ValidationResult[];
  getResultsByEmployee: (employeeId: string) => ValidationResult[];
  clearResults: () => void;
}

export const useValidationStore = create<ValidationState>()(
  persist(
    (set, get) => ({
      validationResults: [],
      isRunning: false,

      runValidation: async () => {
        set({ isRunning: true });

        await new Promise((resolve) => setTimeout(resolve, 1500));

        const employees = useEmployeeStore.getState().employees;
        const salaryRecords = useSalaryStore.getState().salaryRecords;
        const ratioVersions = useRatioStore.getState().ratioVersions;

        const results: ValidationResult[] = [];

        employees.forEach((employee) => {
          const employeeSalaries = salaryRecords.filter(
            (s) => s.employeeId === employee.id
          );

          employeeSalaries.forEach((salary) => {
            const ratio = ratioVersions.find(
              (v) =>
                v.effectiveMonth <= salary.month &&
                (!v.expireMonth || v.expireMonth >= salary.month)
            );

            if (employee.status === "resigned") {
              const resignMonth = employee.resignDate
                ? employee.resignDate.substring(0, 7)
                : null;
              if (resignMonth && salary.month > resignMonth) {
                results.push({
                  id: `v${Date.now()}_${results.length}`,
                  employeeId: employee.id,
                  month: salary.month,
                  type: "conflict",
                  category: "resign_not_stop",
                  description: `员工${employee.name}已于${resignMonth}离职，但${salary.month}仍有缴费记录`,
                  sources: {
                    archive: `离职日期: ${employee.resignDate}`,
                    salary: `工资总额: ¥${salary.totalSalary}`,
                  },
                  timeline: [
                    { time: resignMonth, event: "员工离职", source: "员工档案" },
                    { time: salary.month, event: "工资发放", source: "工资表" },
                  ],
                  createdAt: new Date().toISOString(),
                });
              }
            }

            if (salary.isBackpay && salary.backpayMonths) {
              results.push({
                id: `v${Date.now()}_${results.length}`,
                employeeId: employee.id,
                month: salary.month,
                type: "warning",
                category: "backpay_cross_month",
                description: `${salary.month}工资存在跨月补缴，涉及月份: ${salary.backpayMonths.join(", ")}`,
                sources: {
                  salary: `补缴标志: 是，补缴月份: ${salary.backpayMonths.join(", ")}`,
                },
                timeline: [
                  { time: salary.month, event: "补缴工资发放", source: "工资表" },
                ],
                createdAt: new Date().toISOString(),
              });
            }

            if (ratio?.isDelayed) {
              results.push({
                id: `v${Date.now()}_${results.length}`,
                employeeId: employee.id,
                month: salary.month,
                type: "warning",
                category: "ratio_delayed",
                description: `${salary.month}使用的缴费比例版本延迟到版${ratio.delayedMonths || 0}个月`,
                sources: {
                  ratio: `个人比例: ${(ratio.personalRatio * 100).toFixed(1)}%, 企业比例: ${(ratio.companyRatio * 100).toFixed(1)}%，延迟${ratio.delayedMonths || 0}个月`,
                },
                timeline: [
                  { time: ratio.effectiveMonth, event: "比例版本生效", source: "缴费比例" },
                  { time: salary.month, event: "工资发放", source: "工资表" },
                ],
                createdAt: new Date().toISOString(),
              });
            }
          });
        });

        const monthSet = new Set(salaryRecords.map((s) => s.month));
        monthSet.forEach((month) => {
          const monthRatio = ratioVersions.find(
            (v) =>
              v.effectiveMonth <= month &&
              (!v.expireMonth || v.expireMonth >= month)
          );
          if (!monthRatio) {
            employees.forEach((employee) => {
              const hasSalary = salaryRecords.some(
                (s) => s.employeeId === employee.id && s.month === month
              );
              if (hasSalary) {
                results.push({
                  id: `v${Date.now()}_${results.length}`,
                  employeeId: employee.id,
                  month: month,
                  type: "conflict",
                  category: "ratio_version_mismatch",
                  description: `${month}月找不到匹配的缴费比例版本`,
                  sources: {
                    salary: `该月存在工资记录`,
                    ratio: `无匹配版本`,
                  },
                  timeline: [
                    { time: month, event: "工资发放", source: "工资表" },
                  ],
                  createdAt: new Date().toISOString(),
                });
              }
            });
          }
        });

        set({ validationResults: results, isRunning: false });
      },

      updateResolution: (id, resolution) => {
        set((state) => ({
          validationResults: state.validationResults.map((r) =>
            r.id === id ? { ...r, resolution } : r
          ),
        }));
      },

      markResolved: (id) => {
        set((state) => ({
          validationResults: state.validationResults.map((r) =>
            r.id === id ? { ...r, resolvedAt: new Date().toISOString() } : r
          ),
        }));
      },

      getSummary: () => {
        const results = get().validationResults;
        return {
          total: results.length,
          conflicts: results.filter((r) => r.type === "conflict").length,
          warnings: results.filter((r) => r.type === "warning").length,
          info: results.filter((r) => r.type === "info").length,
          resolved: results.filter((r) => r.resolvedAt).length,
        };
      },

      getResultsByMonth: (month) =>
        get().validationResults.filter((r) => r.month === month),

      getResultsByEmployee: (employeeId) =>
        get().validationResults.filter((r) => r.employeeId === employeeId),

      clearResults: () => set({ validationResults: [] }),
    }),
    { name: "validation-store" }
  )
);
