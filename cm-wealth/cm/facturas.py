"""Facturas en borrador (PDF) y exportación para el programa de facturación.

Los números son provisionales: la numeración oficial y el registro Veri*factu
los pone el programa de facturación homologado al importar el CSV.
"""
import csv
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .comisiones import Calculo, Periodo
from .modelo import formato_eur, formato_num

AZUL = colors.HexColor("#1d3557")
GRIS = colors.HexColor("#6b7280")


def _marca_agua(texto: str):
    def dibujar(lienzo, _doc):
        lienzo.saveState()
        lienzo.setFont("Helvetica-Bold", 40)
        lienzo.setFillColor(colors.Color(0.85, 0.1, 0.1, alpha=0.08))
        lienzo.translate(A4[0] / 2, A4[1] / 2)
        lienzo.rotate(40)
        lienzo.drawCentredString(0, 0, texto)
        lienzo.restoreState()
    return dibujar


def factura_pdf(ruta: Path, numero: str, calc: Calculo, contrato: dict, emisor: dict,
                periodo: Periodo, fecha_emision: date, estado: str, avisos: list[str]):
    estilos = getSampleStyleSheet()
    normal = ParagraphStyle("n", parent=estilos["Normal"], fontSize=9.5, leading=13)
    pequeno = ParagraphStyle("p", parent=normal, fontSize=8, leading=11, textColor=GRIS)
    titulo = ParagraphStyle("t", parent=normal, fontSize=18, leading=22, textColor=AZUL,
                            fontName="Helvetica-Bold")
    seccion = ParagraphStyle("s", parent=normal, fontSize=10.5, textColor=AZUL,
                             fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)

    doc = SimpleDocTemplate(str(ruta), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm,
                            title=f"Factura {numero}", author=emisor["nombre"])
    e = []
    cabecera = Table([[
        Paragraph(f"<b>{emisor['nombre']}</b><br/>{emisor['nif']}<br/>{emisor['direccion']}<br/>{emisor['email']}", normal),
        Paragraph(f"<para alignment='right'><font size=16 color='#1d3557'><b>FACTURA</b></font><br/>"
                  f"Nº {numero}<br/>Fecha: {fecha_emision:%d/%m/%Y}<br/>Periodo: {periodo.nombre} "
                  f"({periodo.inicio:%d/%m/%Y} – {periodo.fin:%d/%m/%Y})</para>", normal),
    ]], colWidths=[95 * mm, 79 * mm])
    cabecera.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    e += [cabecera, Spacer(1, 8 * mm)]

    color_estado = "#15803d" if estado == "Lista para aprobar" else "#b45309"
    e.append(Paragraph(f"<b>Estado:</b> <font color='{color_estado}'><b>{estado}</b></font>", normal))
    for aviso in avisos:
        e.append(Paragraph(f"• {aviso}", pequeno))
    e.append(Spacer(1, 4 * mm))

    e.append(Paragraph("Cliente", seccion))
    e.append(Paragraph(f"<b>{contrato['nombre']}</b><br/>NIF: {contrato['nif']}<br/>{contrato['direccion']}<br/>"
                       f"Contrato {contrato['contrato']} · {contrato['servicio']}", normal))

    e.append(Paragraph("Conceptos", seccion))
    filas = [["Concepto", "Importe"]]
    filas += [[Paragraph(l.concepto, normal), formato_eur(l.importe)] for l in calc.lineas]
    filas += [["Base imponible", formato_eur(calc.base_imponible)],
              [f"IVA {formato_num(calc.iva_pct)} %", formato_eur(calc.cuota_iva)],
              ["TOTAL", formato_eur(calc.total)]]
    tabla = Table(filas, colWidths=[134 * mm, 40 * mm])
    n = len(filas)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), AZUL), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 1), (-1, n - 4), 0.4, colors.HexColor("#d1d5db")),
        ("LINEABOVE", (0, n - 3), (-1, n - 3), 0.8, AZUL),
        ("FONTNAME", (0, n - 1), (-1, n - 1), "Helvetica-Bold"),
        ("BACKGROUND", (0, n - 1), (-1, n - 1), colors.HexColor("#eef2f7")),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    e.append(tabla)

    e.append(Paragraph(f"Forma de pago: {contrato.get('forma_pago', 'Cargo en cuenta')}", pequeno))
    e.append(Paragraph("Detalle del cálculo", seccion))
    for linea in calc.desglose:
        e.append(Paragraph(linea, pequeno))

    doc.build(e, onFirstPage=_marca_agua("BORRADOR · DATOS FICTICIOS"),
              onLaterPages=_marca_agua("BORRADOR · DATOS FICTICIOS"))


def exportar_csv(ruta: Path, filas: list[dict]):
    """Una línea por factura, lista para importar en Holded, a3, Contasol, etc."""
    campos = ["numero_borrador", "fecha", "cliente", "nif", "concepto", "base_imponible",
              "tipo_iva", "cuota_iva", "total", "estado"]
    with open(ruta, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=campos, delimiter=";")
        w.writeheader()
        for fila in filas:
            w.writerow({k: str(v).replace(".", ",") if k in ("base_imponible", "cuota_iva", "total", "tipo_iva") else v
                        for k, v in fila.items()})
