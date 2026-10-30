from pathlib import Path

import fitz
from docx import Document as DocxDocument


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a PDF file.
    """

    text = []

    pdf = fitz.open(file_path)

    for page in pdf:
        page_text = page.get_text()

        if page_text:
            text.append(page_text)

    pdf.close()

    return "\n".join(text).strip()


def extract_text_from_docx(file_path: str) -> str:
    """
    Extract text from a DOCX file.
    """

    document = DocxDocument(file_path)

    paragraphs = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            paragraphs.append(paragraph.text)

    return "\n".join(paragraphs).strip()


def extract_text(
    file_path: str,
    document_type: str,
) -> str:
    """
    Extract text based on document type.
    """

    if document_type == "pdf":
        return extract_text_from_pdf(file_path)

    if document_type == "docx":
        return extract_text_from_docx(file_path)

    raise ValueError(
        f"Unsupported document type: {document_type}"
    )