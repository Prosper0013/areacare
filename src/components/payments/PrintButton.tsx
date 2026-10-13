"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-dark btn-sm print:hidden">
      <Printer size={16} /> Print or save as PDF
    </button>
  );
}
