import Papa from "papaparse"
import * as XLSX from "xlsx"
import type { RawImportResult } from "@/types"

export function parseCSV(file: File): Promise<RawImportResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || []
        const rows = results.data as Record<string, string | number>[]
        resolve({
          headers,
          rows,
          rowCount: rows.length,
          importedAt: Date.now(),
        })
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}

export function parseExcel(file: File): Promise<RawImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheet = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheet]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, {
          defval: "",
        })
        const headers =
          jsonData.length > 0 ? Object.keys(jsonData[0]) : []
        resolve({
          headers,
          rows: jsonData,
          rowCount: jsonData.length,
          importedAt: Date.now(),
        })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}

export function parseFile(file: File): Promise<RawImportResult> {
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "csv") return parseCSV(file)
  if (ext === "xlsx" || ext === "xls") return parseExcel(file)
  return Promise.reject(new Error(`Unsupported file format: .${ext}`))
}
