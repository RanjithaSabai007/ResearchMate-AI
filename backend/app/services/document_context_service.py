from html.parser import HTMLParser
import re

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []

    def handle_data(self, data):
        self.result.append(data)

    def get_text(self):
        return "".join(self.result)


def clean_html(html_content: str) -> str:
    """
    Strips HTML tags cleanly to pass plain text context to the prompt.
    """
    if not html_content:
        return ""
    parser = HTMLTextExtractor()
    try:
        parser.feed(html_content)
        plain_text = parser.get_text()
        # Collapse multiple newlines/spaces
        plain_text = re.sub(r'\n+', '\n', plain_text)
        return plain_text.strip()
    except Exception:
        # Fallback to regex strip if parser fails
        return re.sub('<[^<]+?>', '', html_content).strip()


def get_document_context(
    draft_content: str,
    selected_text: str = None,
    cursor_paragraph: str = None,
    current_heading: str = None
) -> dict:
    """
    Assembles structured, clean document text context from raw inputs.
    """
    clean_draft = clean_html(draft_content)
    clean_selected = clean_html(selected_text) if selected_text else None
    clean_cursor = clean_html(cursor_paragraph) if cursor_paragraph else None
    clean_heading = clean_html(current_heading) if current_heading else None

    return {
        "draft_content": clean_draft,
        "selected_text": clean_selected,
        "cursor_paragraph": clean_cursor,
        "current_heading": clean_heading
    }
