"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { parseApiCreatedAtUtcMs } from "@/lib/appointmentSchedule";
import { DocumentType } from "@/components/DocumentRequestForms";

/**
 * Barangay document preview. Portals to document.body so it always appears above
 * nav and layout stacking contexts.
 */

export type ClearanceViewerAppointment = {
  id: number;
  name: string;
  age: number;
  address: string;
  day: string;
  month: string;
  location: string;
  document_type: string;
  status: string;
  created_at: string;
};

type BookingPreviewRequest = {
  name: string;
  age: number;
  address: string;
  location: string;
  documentType: DocumentType;
  details: Record<string, string>;
};

type ClearanceDocumentModalProps = {
  open: boolean;
  mode?: "booking" | "view";
  bookingRequest?: BookingPreviewRequest;
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

function toDocumentType(value: string | undefined): DocumentType {
  if (
    value === "Certificate of Indigency" ||
    value === "Business Permit" ||
    value === "Proof of Residency"
  ) {
    return value;
  }
  return "Barangay Clearance";
}

function titleForDocument(documentType: DocumentType): string {
  if (documentType === "Certificate of Indigency") return "Certificate of Indigency";
  if (documentType === "Business Permit") return "Barangay Business Permit";
  if (documentType === "Proof of Residency") return "Proof of Residency";
  return "Barangay Clearance";
}

function formatDetailLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

export function ClearanceDocumentModal({
  open,
  mode = "booking",
  bookingRequest,
  viewerAppointment,
  onContinue,
  onDismiss,
}: ClearanceDocumentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [bookingOrNo] = useState(() => Math.floor(10000 + Math.random() * 90000));

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const isView = mode === "view" && viewerAppointment != null;
  const documentType = isView
    ? toDocumentType(viewerAppointment.document_type)
    : bookingRequest?.documentType ?? "Barangay Clearance";
  const details = bookingRequest?.details ?? {};

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

  const name = isView ? viewerAppointment.name : bookingRequest?.name || "Resident Name";
  const age = isView ? viewerAppointment.age : bookingRequest?.age || 0;
  const residentLine = isView
    ? `${viewerAppointment.address} (${viewerAppointment.location})`
    : `${bookingRequest?.address || "Barangay address"} (${bookingRequest?.location || "Pickup location"})`;

  const statusClass = isView
    ? statusPillClassForDoc(viewerAppointment.status)
    : "clearance-document-preview__status clearance-document-preview__status--pending";
  const statusLabel = isView ? statusPillText(viewerAppointment.status) : "Pending";
  const footerStatus = isView ? statusPillText(viewerAppointment.status) : "Pending";

  const issuedLine = isView ? (
    <>
      <strong>APPOINTMENT</strong> scheduled for {viewerAppointment.day} {viewerAppointment.month} (
      {documentType} pickup). Issued for reference upon your booking request.
    </>
  ) : (
    <>
      <strong>ISSUED</strong> this {dateIssued}, at Poblacion 2, Cabadbaran City upon request of the
      interested party for whatever legal purposes it may serve.
    </>
  );

  const documentBody = (() => {
    if (documentType === "Certificate of Indigency") {
      return (
        <>
          <h2 className="clearance-document-preview__salutation">To whom it may concern:</h2>
          <p>
            This is to certify that <strong>{name}</strong>, {age || "__"} years old, and a resident
            of {residentLine}, has personally requested a Certificate of Indigency from this office.
          </p>
          <p>
            Based on the information presented, the applicant has declared a monthly income of{" "}
            <strong>{details.monthlyIncome || "________"}</strong> and is requesting this certificate
            for <strong>{details.purpose || "the stated purpose"}</strong>.
          </p>
          <p>
            This certification is issued upon request of the interested party for any legal purpose it
            may serve, subject to verification by the barangay.
          </p>
        </>
      );
    }

    if (documentType === "Business Permit") {
      return (
        <>
          <h2 className="clearance-document-preview__salutation">Barangay Business Permit</h2>
          <p>
            This is to certify that <strong>{details.ownerName || name}</strong> has requested
            barangay clearance for the operation of{" "}
            <strong>{details.businessName || "the business"}</strong>, classified as{" "}
            <strong>{details.businessType || "business activity"}</strong>.
          </p>
          <p>
            The business is located at <strong>{details.businessAddress || residentLine}</strong> and
            the requested permit transaction is{" "}
            <strong>{details.permitType || "permit processing"}</strong>.
          </p>
          <p>
            This document is prepared for review by the barangay and shall be subject to inspection,
            applicable ordinances, and final approval.
          </p>
        </>
      );
    }

    if (documentType === "Proof of Residency") {
      return (
        <>
          <h2 className="clearance-document-preview__salutation">To whom it may concern:</h2>
          <p>
            This is to certify that <strong>{name}</strong>, {age || "__"} years old, is a resident
            of {residentLine}.
          </p>
          <p>
            The applicant has declared a length of residency of{" "}
            <strong>{details.lengthOfResidency || "________"}</strong> and requests this proof of
            residency for <strong>{details.reasonForRequest || "the stated purpose"}</strong>.
          </p>
          <p>
            This certification is issued upon request of the interested party for whatever legal
            purpose it may serve.
          </p>
        </>
      );
    }

    return (
      <>
        <h2 className="clearance-document-preview__salutation">To whom it may concern:</h2>
        <p>
          This is to certify that <strong>{name}</strong>, {age || "__"} years old, and a resident of{" "}
          {residentLine} is known to be of good moral character and law-abiding citizen in the
          community.
        </p>
        <p>
          To certify further, that he/she has no derogatory and/or criminal records filed in this
          barangay.
        </p>
        <p>{issuedLine}</p>
      </>
    );
  })();

  const node = (
    <div className="clearance-doc-modal-overlay" role="presentation" onClick={onDismiss}>
      <div
        className="clearance-doc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clearance-doc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="clearance-doc-title" className="clearance-doc-modal__hint">
          {isView
            ? `Reference copy of the ${titleForDocument(documentType)} format for this appointment.`
            : "Sample document - review your details before submitting the appointment."}
        </p>

        <div className="clearance-document-preview">
          <div className="clearance-document-preview__top-row">
            <button
              type="button"
              className="clearance-document-preview__back-home"
              onClick={onDismiss}
            >
              {isView ? "Close" : "Back to Form"}
            </button>
            <span className={statusClass}>{statusLabel}</span>
          </div>

          <header className="clearance-document-preview__header">
            <h1 className="clearance-document-preview__republic">Republic of the Philippines</h1>
            <p className="clearance-document-preview__header-line">Province of Agusan Del Norte</p>
            <p className="clearance-document-preview__header-line">Municipality of Cabadbaran City</p>
            <p className="clearance-document-preview__header-line">Barangay Calamba</p>
          </header>

          <div className="clearance-document-preview__title-block">
            <span className="clearance-document-preview__title-line">
              Office of the Barangay Captain
            </span>
            <span className="clearance-document-preview__title-line">
              {titleForDocument(documentType)}
            </span>
          </div>

          <div className="clearance-document-preview__body-wrap">
            <div className="clearance-document-preview__seal" aria-hidden>
              OFFICIAL SEAL
            </div>

            <div className="clearance-document-preview__body">
              {documentBody}
              {!isView && Object.keys(details).length > 0 ? (
                <div className="clearance-document-preview__details">
                  {Object.entries(details).map(([key, value]) => (
                    <p key={key}>
                      <strong>{formatDetailLabel(key)}:</strong> {value}
                    </p>
                  ))}
                </div>
              ) : null}
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
              <span className="clearance-document-preview__meta-label">Document Type:</span>{" "}
              {titleForDocument(documentType)}
            </p>
            <p>
              <span className="clearance-document-preview__meta-label">Status:</span> {footerStatus}
            </p>
          </footer>
        </div>

        {!isView && (
          <div className="clearance-doc-modal__actions">
            <button type="button" className="clearance-doc-modal__btn secondary" onClick={onDismiss}>
              Go back
            </button>
            <button type="button" className="clearance-doc-modal__btn primary" onClick={onContinue}>
              I have read this - submit appointment
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
