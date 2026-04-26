from __future__ import annotations

from reportlab.lib import colors
from reportlab.lib.units import cm


PDF_LEFT_MARGIN = 1.5 * cm
PDF_RIGHT_MARGIN = 1.5 * cm
PDF_TOP_MARGIN = 1.4 * cm
PDF_BOTTOM_MARGIN = 1.4 * cm


def draw_labordaten_pdf_page(canvas, document, document_label: str, footer_label: str) -> None:
    page_width, page_height = document.pagesize
    canvas.saveState()

    icon_size = 0.34 * cm
    icon_x = PDF_LEFT_MARGIN
    icon_y = page_height - 0.99 * cm
    _draw_labordaten_icon(canvas, icon_x, icon_y, icon_size)

    canvas.setFillColor(colors.HexColor("#16324f"))
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(icon_x + icon_size + 0.16 * cm, page_height - 0.85 * cm, "Labordaten")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(page_width - PDF_RIGHT_MARGIN, page_height - 0.85 * cm, document_label)

    canvas.setStrokeColor(colors.HexColor("#b7c6d9"))
    canvas.setLineWidth(0.4)
    canvas.line(PDF_LEFT_MARGIN, page_height - 1.05 * cm, page_width - PDF_RIGHT_MARGIN, page_height - 1.05 * cm)
    canvas.line(PDF_LEFT_MARGIN, 0.95 * cm, page_width - PDF_RIGHT_MARGIN, 0.95 * cm)

    canvas.setFillColor(colors.HexColor("#5b6572"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(PDF_LEFT_MARGIN, 0.62 * cm, footer_label)
    canvas.drawRightString(page_width - PDF_RIGHT_MARGIN, 0.62 * cm, f"Seite {canvas.getPageNumber()}")
    canvas.restoreState()


def _draw_labordaten_icon(canvas, x: float, y: float, size: float) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#8ca59c"))
    canvas.setLineWidth(0.5)
    canvas.setFillColor(colors.HexColor("#e8f2ec"))
    canvas.roundRect(x, y, size, size, radius=size * 0.25, fill=1, stroke=1)

    canvas.setStrokeColor(colors.HexColor("#d8ba82"))
    canvas.setLineWidth(0.45)
    canvas.line(x + size * 0.15, y + size * 0.74, x + size * 0.86, y + size * 0.82)
    canvas.line(x + size * 0.14, y + size * 0.28, x + size * 0.82, y + size * 0.42)

    canvas.setFillColor(colors.HexColor("#204f42"))
    canvas.roundRect(x + size * 0.14, y + size * 0.22, size * 0.46, size * 0.30, radius=size * 0.08, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#edf6f2"))
    for index, height in enumerate((0.14, 0.19, 0.11, 0.16)):
        bar_x = x + size * (0.20 + index * 0.08)
        canvas.roundRect(bar_x, y + size * 0.28, size * 0.035, size * height, radius=size * 0.018, fill=1, stroke=0)

    canvas.setFillColor(colors.HexColor("#f4fbf8"))
    canvas.setStrokeColor(colors.HexColor("#8ca59c"))
    canvas.setLineWidth(0.45)
    flask_path = canvas.beginPath()
    flask_path.moveTo(x + size * 0.64, y + size * 0.78)
    flask_path.lineTo(x + size * 0.78, y + size * 0.78)
    flask_path.lineTo(x + size * 0.74, y + size * 0.66)
    flask_path.lineTo(x + size * 0.74, y + size * 0.56)
    flask_path.lineTo(x + size * 0.84, y + size * 0.39)
    flask_path.curveTo(x + size * 0.88, y + size * 0.31, x + size * 0.83, y + size * 0.25, x + size * 0.76, y + size * 0.25)
    flask_path.lineTo(x + size * 0.58, y + size * 0.25)
    flask_path.curveTo(x + size * 0.51, y + size * 0.25, x + size * 0.46, y + size * 0.31, x + size * 0.50, y + size * 0.39)
    flask_path.lineTo(x + size * 0.60, y + size * 0.56)
    flask_path.lineTo(x + size * 0.60, y + size * 0.66)
    flask_path.close()
    canvas.drawPath(flask_path, fill=1, stroke=1)
    canvas.setStrokeColor(colors.HexColor("#88b2a0"))
    canvas.setLineWidth(0.5)
    canvas.line(x + size * 0.56, y + size * 0.35, x + size * 0.80, y + size * 0.35)
    canvas.setFillColor(colors.HexColor("#c99c56"))
    canvas.circle(x + size * 0.79, y + size * 0.79, size * 0.045, fill=1, stroke=0)
    canvas.restoreState()
