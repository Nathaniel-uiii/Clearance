"use client";

import { ChangeEvent } from "react";

export const DOCUMENT_TYPES = [
  "Barangay Clearance",
  "Certificate of Indigency",
  "Business Permit",
  "Proof of Residency",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type BarangayClearanceData = {
  purpose: string;
  validId: File | null;
};

export type CertificateOfIndigencyData = {
  monthlyIncome: string;
  purpose: string;
  supportingDocument: File | null;
};

export type BusinessPermitData = {
  businessName: string;
  businessType: string;
  ownerName: string;
  businessAddress: string;
  permitType: string;
  businessDocument: File | null;
};

export type ProofOfResidencyData = {
  lengthOfResidency: string;
  reasonForRequest: string;
  validId: File | null;
};

export type DocumentFormDataMap = {
  "Barangay Clearance": BarangayClearanceData;
  "Certificate of Indigency": CertificateOfIndigencyData;
  "Business Permit": BusinessPermitData;
  "Proof of Residency": ProofOfResidencyData;
};

export type DocumentFormErrors<T extends DocumentType = DocumentType> = Partial<
  Record<keyof DocumentFormDataMap[T], string>
>;

type BaseDocumentFormProps<T extends DocumentType> = {
  data: DocumentFormDataMap[T];
  errors: DocumentFormErrors<T>;
  onTextChange: (field: keyof DocumentFormDataMap[T], value: string) => void;
  onFileChange: (field: keyof DocumentFormDataMap[T], file: File | null) => void;
  onBlur: (field: keyof DocumentFormDataMap[T]) => void;
};

function TextField({
  id,
  label,
  value,
  error,
  placeholder,
  type = "text",
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  placeholder: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="input-box">
      <label htmlFor={id}>{label} *</label>
      <input
        id={id}
        type={type}
        className={`input-field ${error ? "input-field--error" : ""}`}
        placeholder={placeholder}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <div className="field-error" id={`${id}-error`}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  error,
  options,
  placeholder,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="input-box">
      <label htmlFor={id}>{label} *</label>
      <select
        id={id}
        className={`input-field custom-select ${error ? "input-field--error" : ""}`}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <div className="field-error" id={`${id}-error`}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

function FileField({
  id,
  label,
  file,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  file: File | null;
  error?: string;
  onChange: (file: File | null) => void;
  onBlur: () => void;
}) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.files?.[0] ?? null);
  }

  return (
    <div className="input-box">
      <label htmlFor={id}>{label} *</label>
      <input
        id={id}
        type="file"
        className={`input-field file-field ${error ? "input-field--error" : ""}`}
        accept=".jpg,.jpeg,.png,.pdf"
        required={!file}
        onChange={handleChange}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
      />
      <p className="file-preview" id={`${id}-hint`}>
        {file ? `${file.name} (${Math.ceil(file.size / 1024)} KB)` : "PDF, JPG, JPEG, or PNG up to 5 MB."}
      </p>
      {error ? (
        <div className="field-error" id={`${id}-error`}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

export function BarangayClearanceForm({
  data,
  errors,
  onTextChange,
  onFileChange,
  onBlur,
}: BaseDocumentFormProps<"Barangay Clearance">) {
  return (
    <div className="document-form-grid">
      <TextField
        id="clearance-purpose"
        label="Purpose"
        value={data.purpose}
        error={errors.purpose}
        placeholder="Employment, school, government transaction"
        onChange={(value) => onTextChange("purpose", value)}
        onBlur={() => onBlur("purpose")}
      />
      <FileField
        id="clearance-valid-id"
        label="Valid ID Upload"
        file={data.validId}
        error={errors.validId}
        onChange={(file) => onFileChange("validId", file)}
        onBlur={() => onBlur("validId")}
      />
    </div>
  );
}

export function CertificateOfIndigencyForm({
  data,
  errors,
  onTextChange,
  onFileChange,
  onBlur,
}: BaseDocumentFormProps<"Certificate of Indigency">) {
  return (
    <div className="document-form-grid">
      <TextField
        id="indigency-income"
        label="Monthly Income"
        type="number"
        value={data.monthlyIncome}
        error={errors.monthlyIncome}
        placeholder="Enter monthly income"
        onChange={(value) => onTextChange("monthlyIncome", value)}
        onBlur={() => onBlur("monthlyIncome")}
      />
      <TextField
        id="indigency-purpose"
        label="Purpose"
        value={data.purpose}
        error={errors.purpose}
        placeholder="Medical assistance, scholarship, fee waiver"
        onChange={(value) => onTextChange("purpose", value)}
        onBlur={() => onBlur("purpose")}
      />
      <FileField
        id="indigency-support"
        label="Supporting Document Upload"
        file={data.supportingDocument}
        error={errors.supportingDocument}
        onChange={(file) => onFileChange("supportingDocument", file)}
        onBlur={() => onBlur("supportingDocument")}
      />
    </div>
  );
}

export function BusinessPermitForm({
  data,
  errors,
  onTextChange,
  onFileChange,
  onBlur,
}: BaseDocumentFormProps<"Business Permit">) {
  return (
    <div className="document-form-grid">
      <TextField
        id="business-name"
        label="Business Name"
        value={data.businessName}
        error={errors.businessName}
        placeholder="Enter registered business name"
        onChange={(value) => onTextChange("businessName", value)}
        onBlur={() => onBlur("businessName")}
      />
      <SelectField
        id="business-type"
        label="Business Type"
        value={data.businessType}
        error={errors.businessType}
        placeholder="Select business type"
        options={["Sari-sari store", "Food service", "Retail", "Services", "Online business", "Other"]}
        onChange={(value) => onTextChange("businessType", value)}
        onBlur={() => onBlur("businessType")}
      />
      <TextField
        id="business-owner"
        label="Owner Name"
        value={data.ownerName}
        error={errors.ownerName}
        placeholder="Enter owner name"
        onChange={(value) => onTextChange("ownerName", value)}
        onBlur={() => onBlur("ownerName")}
      />
      <TextField
        id="business-address"
        label="Business Address"
        value={data.businessAddress}
        error={errors.businessAddress}
        placeholder="Enter business address"
        onChange={(value) => onTextChange("businessAddress", value)}
        onBlur={() => onBlur("businessAddress")}
      />
      <SelectField
        id="permit-type"
        label="Permit Type"
        value={data.permitType}
        error={errors.permitType}
        placeholder="Select permit type"
        options={["New permit", "Renewal", "Amendment"]}
        onChange={(value) => onTextChange("permitType", value)}
        onBlur={() => onBlur("permitType")}
      />
      <FileField
        id="business-document"
        label="Business Document Upload"
        file={data.businessDocument}
        error={errors.businessDocument}
        onChange={(file) => onFileChange("businessDocument", file)}
        onBlur={() => onBlur("businessDocument")}
      />
    </div>
  );
}

export function ProofOfResidencyForm({
  data,
  errors,
  onTextChange,
  onFileChange,
  onBlur,
}: BaseDocumentFormProps<"Proof of Residency">) {
  return (
    <div className="document-form-grid">
      <TextField
        id="residency-length"
        label="Length of Residency"
        value={data.lengthOfResidency}
        error={errors.lengthOfResidency}
        placeholder="Example: 5 years"
        onChange={(value) => onTextChange("lengthOfResidency", value)}
        onBlur={() => onBlur("lengthOfResidency")}
      />
      <TextField
        id="residency-reason"
        label="Reason for Request"
        value={data.reasonForRequest}
        error={errors.reasonForRequest}
        placeholder="Utilities, school, scholarship, employment"
        onChange={(value) => onTextChange("reasonForRequest", value)}
        onBlur={() => onBlur("reasonForRequest")}
      />
      <FileField
        id="residency-valid-id"
        label="Valid ID Upload"
        file={data.validId}
        error={errors.validId}
        onChange={(file) => onFileChange("validId", file)}
        onBlur={() => onBlur("validId")}
      />
    </div>
  );
}
