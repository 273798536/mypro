import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import FormulaCalcPage from "@/pages/FormulaCalcPage";
import ImportPage from "@/pages/ImportPage";
import CorrectionPage from "@/pages/CorrectionPage";
import ReviewPage from "@/pages/ReviewPage";
import VersionsPage from "@/pages/VersionsPage";
import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { MOCK_RECORDS, MOCK_BATCHES } from "@/data/mockData";

const SEED_FLAG_KEY = "lp-meal-planning-seeded-v2";

function SeedMockData() {
  const records = useAppStore((s) => s.records);
  const addRecord = useAppStore((s) => s.addRecord);
  const addBatch = useAppStore((s) => s.addBatch);

  useEffect(() => {
    const alreadySeeded = localStorage.getItem(SEED_FLAG_KEY);
    if (records.length > 0 || alreadySeeded) return;

    const batch = addBatch({
      ...MOCK_BATCHES[0],
      recordIds: [],
    });

    const createdRecordIds: string[] = [];
    MOCK_RECORDS.forEach((r) => {
      const created = addRecord({
        ...r,
        batchId: batch.id,
      });
      createdRecordIds.push(created.id);
    });

    useAppStore.getState().updateBatch(batch.id, {
      recordIds: createdRecordIds,
    });

    localStorage.setItem(SEED_FLAG_KEY, "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function App() {
  return (
    <Router>
      <SeedMockData />
      <Routes>
        <Route path="/" element={<FormulaCalcPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/correction" element={<CorrectionPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/versions" element={<VersionsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
