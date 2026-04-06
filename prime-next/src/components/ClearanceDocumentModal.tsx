"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { parseApiCreatedAtUtcMs } from "@/lib/appointmentSchedule";

/**
 * Barangay Clearance preview — visual match to services.php / reference UI.
 * Portals to document.body so it always appears above the nav and layout stacking contexts.
 */

export type ClearanceViewerAppointment = {
  id: number;
  name: string;
  age: number;
  address: string;
  day: string;
  month: string;
  location: string;
  status: string;
  created_at: string;
};

type ClearanceDocumentModalProps = {
  open: boolean;
  mode?: "booking" | "view";
  viewerAppointment?: ClearanceViewerAppointment;
  onContinue: () => void;
  onDismiss: () => void;
};

function formatDateIssuedDdMmYyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function statusPillClassForDoc(status: string): string {
  const s = status.toLowerCase();
  if (s === "done" || s === "completed") {
    return "clearance-document-preview__status clearance-document-preview__status--done";
  }
  if (s === "cancelled") {
    return "clearance-document-preview__status clearance-document-preview__status--cancelled";
  }
  return "clearance-document-preview__status clearance-document-preview__status--pending";
}

function statusPillText(status: string): string {
  const s = status.toLowerCase();
  if (s === "done" || s === "completed") return "Done";
  if (s === "cancelled") return "Cancelled";
  if (s === "pending") return "Pending";
  return status;
}

function metaStatusText(status: string): string {
  return statusPillText(status);
}

export function ClearanceDocumentModal({
  open,
  mode = "booking",
  viewerAppointment,
  onContinue,
  onDismiss,
}: ClearanceDocumentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [bookingOrNo] = useState(() => Math.floor(10000 + Math.random() * 90000));

  useEffect(() => {
    setMounted(true);
  }, []);

  const isView = mode === "view" && viewerAppointment != null;

  const displayOrNo = useMemo(() => {
    if (isView) return 10000 + (viewerAppointment.id % 90000);
    return bookingOrNo;
  }, [isView, viewerAppointment, bookingOrNo]);

  const dateIssued = useMemo(() => {
    if (isView && viewerAppointment.created_at) {
      const ms = parseApiCreatedAtUtcMs(viewerAppointment.created_at);
      if (ms != null) return formatDateIssuedDdMmYyyy(new Date(ms));
    }
    return formatDateIssuedDdMmYyyy(new Date());
  }, [isView, viewerAppointment]);

  if (!open || !mounted) return null;

  const name = isView ? viewerAppointment.name : "Kenneth A. Baldomar";
  const age = isView ? viewerAppointment.age : 22;
  const residentLine = isView
    ? `${viewerAppointment.address} (${viewerAppointment.location})`
    : "Calamba";

  const statusClass = isView
    ? statusPillClassForDoc(viewerAppointment.status)
    : "clearance-document-preview__status clearance-document-preview__status--pending";
  const statusLabel = isView ? statusPillText(viewerAppointment.status) : "Pending";
  const footerStatus = isView ? metaStatusText(viewerAppointment.status) : "Pending";

  const issuedLine = isView ? (
    <>
      <strong>APPOINTMENT</strong> scheduled for {viewerAppointment.day} {viewerAppointment.month}{" "}
      (barangay clearance pickup). Issued for reference upon your booking request.
    </>
  ) : (
    <>
      <strong>ISSUED</strong> this 7th day of April, at Poblacion 2, Cabadbaran City upon request of
      the interested party for whatever legal purposes it may serve.
    </>
  );

  const node = (
    <div
      className="clearance-doc-modal-overlay"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        className="clearance-doc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clearance-doc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="clearance-doc-title" className="clearance-doc-modal__hint">
          {isView
            ? "Reference copy of the barangay clearance format for this appointment."
            : "Sample document — your own details will appear after you book an appointment."}
        </p>

        <div className="clearance-document-preview">
          <div className="clearance-document-preview__top-row">
            <button
              type="button"
              className="clearance-document-preview__back-home"
              onClick={onDismiss}
            >
              {isView ? "Close" : "Back to Home"}
            </button>
            <span className={statusClass}>{statusLabel}</span>
          </div>

          <header className="clearance-document-preview__header">
            <h1 className="clearance-document-preview__republic">
              Republic of the Philippines
            </h1>
            <p className="clearance-document-preview__header-line">Province of Agusan Del Norte</p>
            <p className="clearance-document-preview__header-line">
              Municipality of Cabadbaran City
            </p>
            <p className="clearance-document-preview__header-line">Barangay Calamba</p>
          </header>

          <div className="clearance-document-preview__title-block">
            <span className="clearance-document-preview__title-line">
              Office of the Barangay Captain
            </span>
            <span className="clearance-document-preview__title-line">
              Barangay Clearance
            </span>
          </div>

          <div className="clearance-document-preview__body-wrap">
            <div className="clearance-document-preview__seal" aria-hidden>
              OFFICIAL SEAL
            </div>

            <div className="clearance-document-preview__body">
              <h2 className="clearance-document-preview__salutation">To whom it may concern:</h2>
              <p>
                This is to certify that <strong>{name}</strong>, {age} years old, and a resident of{" "}
                {residentLine} is known to be of good moral character and law-abiding citizen in the
                community.
              </p>
              <p>
                To certify further, that he/she has no derogatory and/or criminal records filed in
                this barangay.
              </p>
              <p>{issuedLine}</p>
            </div>

            <div className="clearance-document-preview__signature-block">
              <div className="clearance-document-preview__signature-inner">
                <div className="clearance-document-preview__signature-line" />
                <p className="clearance-document-preview__signature-name">Barangay Captain</p>
                <p className="clearance-document-preview__signature-title">Barangay Official</p>
              </div>
            </div>
          </div>

          <footer className="clearance-document-preview__meta">
            <p>
              <span className="clearance-document-preview__meta-label">O.R No. :</span> {displayOrNo}
            </p>
            <p>
              <span className="clearance-document-preview__meta-label">Date Issued :</span>{" "}
              {dateIssued}
            </p>
            <p>
              <span className="clearance-document-preview__meta-label">Doc. Stamp:</span> Paid
            </p>
            <p>
              <span className="clearance-document-preview__meta-label">Status:</span> {footerStatus}
            </p>
          </footer>
        </div>

        <div
          className={`clearance-doc-modal__actions${isView ? " clearance-doc-modal__actions--single" : ""}`}
        >
          {isView ? (
            <button type="button" className="clearance-doc-modal__btn primary" onClick={onDismiss}>
              Close
            </button>
          ) : (
            <>
              <button type="button" className="clearance-doc-modal__btn secondary" onClick={onDismiss}>
                Go back
              </button>
              <button type="button" className="clearance-doc-modal__btn primary" onClick={onContinue}>
                I have read this — submit appointment
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
