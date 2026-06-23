import fitz


def extract_first_pages_text(pdf_bytes, max_pages=5):
    text = ""

    pdf = fitz.open(stream=pdf_bytes, filetype="pdf")

    pages_to_read = min(max_pages, len(pdf))

    for page_num in range(pages_to_read):
        page = pdf.load_page(page_num)
        text += page.get_text()

    pdf.close()

    return text