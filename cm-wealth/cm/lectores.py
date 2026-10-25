"""Un lector por fuente. Cada uno devuelve posiciones y movimientos en el formato común.

Para añadir un banco nuevo basta con escribir otro lector que devuelva lo mismo.
"""
import csv
from decimal import Decimal
from pathlib import Path
import re

import openpyxl
import pdfplumber

from .modelo import (EFECTIVO, Historial, Movimiento, Posicion, fecha_es,
                     numero_es)

CONCEPTOS = {
    "APORTACION": "APORTACION", "APORTACIÓN": "APORTACION", "INGRESO": "APORTACION",
    "RETIRADA": "RETIRADA", "REEMBOLSO AL CLIENTE": "RETIRADA",
    "COMPRA": "COMPRA", "SUSCRIPCION": "COMPRA", "SUSCRIPCIÓN": "COMPRA",
    "VENTA": "VENTA", "REEMBOLSO": "VENTA",
    "DIVIDENDO": "DIVIDENDO", "CUPON": "DIVIDENDO", "CUPÓN": "DIVIDENDO",
    "COMISION": "COMISION", "COMISIÓN": "COMISION", "COMISION CUSTODIA": "COMISION",
}


def tipo_movimiento(concepto: str) -> str:
    clave = concepto.strip().upper()
    for prefijo, tipo in CONCEPTOS.items():
        if clave.startswith(prefijo):
            return tipo
    raise ValueError(f"Concepto de movimiento desconocido: {concepto!r}")


def leer_pdf_banco_atlantico(ruta: Path) -> tuple[list[Posicion], list[Movimiento]]:
    """Extracto en PDF: una página por cuenta, con tabla de posiciones y de movimientos."""
    fuente = f"Banco Atlántico (PDF {ruta.name})"
    posiciones, movimientos = [], []
    with pdfplumber.open(ruta) as pdf:
        for pagina in pdf.pages:
            texto = pagina.extract_text() or ""
            m_cuenta = re.search(r"Cuenta de valores:\s*(\S+)", texto)
            m_fecha = re.search(r"Fecha de valoración:\s*(\d{2}/\d{2}/\d{4})", texto)
            if not m_cuenta or not m_fecha:
                continue
            cuenta, fecha = m_cuenta.group(1), fecha_es(m_fecha.group(1))
            for tabla in pagina.extract_tables():
                cabecera = [(c or "").strip() for c in tabla[0]]
                filas = [[(c or "").strip() for c in f] for f in tabla[1:]]
                if cabecera[0] == "ISIN":
                    for isin, nombre, titulos, precio, divisa, valor in filas:
                        if isin.upper() == "TOTAL":
                            continue
                        es_efectivo = nombre.lower().startswith("efectivo")
                        posiciones.append(Posicion(
                            cuenta=cuenta, isin=EFECTIVO if es_efectivo else isin, nombre=nombre,
                            titulos=Decimal(1) if es_efectivo else numero_es(titulos),
                            precio=numero_es(valor) if es_efectivo else numero_es(precio),
                            divisa=divisa, tipo_cambio=Decimal(1), valor_eur=numero_es(valor),
                            fecha=fecha, fuente=fuente))
                elif cabecera[0] == "Fecha":
                    for f, concepto, isin, importe in filas:
                        movimientos.append(Movimiento(
                            cuenta=cuenta, fecha=fecha_es(f), tipo=tipo_movimiento(concepto),
                            isin=isin if isin not in ("", "—", "-") else "",
                            importe_eur=numero_es(importe), descripcion=concepto, fuente=fuente))
    return posiciones, movimientos


def _csv_es(ruta: Path) -> list[dict]:
    with open(ruta, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def leer_csv_banco_meridional(ruta_posiciones: Path, ruta_movimientos: Path) -> tuple[list[Posicion], list[Movimiento]]:
    """Exportación CSV del portal: separador ';' y decimales con coma."""
    posiciones, movimientos = [], []
    for fila in _csv_es(ruta_posiciones):
        isin = fila["ISIN"].strip()
        es_efectivo = isin.upper() in ("", "LIQUIDEZ", "CASH")
        posiciones.append(Posicion(
            cuenta=fila["Cuenta"].strip(), isin=EFECTIVO if es_efectivo else isin,
            nombre=fila["Descripción"].strip(), titulos=numero_es(fila["Cantidad"]),
            precio=numero_es(fila["Precio"]), divisa=fila["Divisa"].strip(),
            tipo_cambio=numero_es(fila["Cambio EUR"]), valor_eur=numero_es(fila["Valor EUR"]),
            fecha=fecha_es(fila["Fecha valoración"]), fuente=f"Banco Meridional (CSV {ruta_posiciones.name})"))
    for fila in _csv_es(ruta_movimientos):
        movimientos.append(Movimiento(
            cuenta=fila["Cuenta"].strip(), fecha=fecha_es(fila["Fecha"]),
            tipo=tipo_movimiento(fila["Concepto"]), isin=fila["ISIN"].strip(),
            importe_eur=numero_es(fila["Importe EUR"]), descripcion=fila["Concepto"].strip(),
            fuente=f"Banco Meridional (CSV {ruta_movimientos.name})"))
    return posiciones, movimientos


def _hoja(libro, nombre: str) -> list[dict]:
    filas = list(libro[nombre].iter_rows(values_only=True))
    cabecera = [str(c).strip() for c in filas[0]]
    return [dict(zip(cabecera, f)) for f in filas[1:] if any(v is not None for v in f)]


def leer_excel_interno(ruta: Path) -> tuple[list[Posicion], list[Movimiento], dict[str, Historial]]:
    """El Excel propio de la gestora: hojas Posiciones, Movimientos e Historial."""
    libro = openpyxl.load_workbook(ruta, data_only=True)
    fuente = f"Registro interno (Excel {ruta.name})"
    posiciones = [Posicion(
        cuenta=str(f["Cuenta"]), isin=str(f["ISIN"]), nombre=str(f["Nombre"]),
        titulos=numero_es(f["Títulos"]), precio=numero_es(f["Precio"]), divisa=str(f["Divisa"]),
        tipo_cambio=numero_es(f["Tipo cambio"]), valor_eur=numero_es(f["Valor EUR"]),
        fecha=f["Fecha"].date() if hasattr(f["Fecha"], "date") else fecha_es(f["Fecha"]),
        fuente=fuente, cliente=str(f["Cliente"])) for f in _hoja(libro, "Posiciones")]
    movimientos = [Movimiento(
        cuenta=str(f["Cuenta"]),
        fecha=f["Fecha"].date() if hasattr(f["Fecha"], "date") else fecha_es(f["Fecha"]),
        tipo=tipo_movimiento(str(f["Tipo"])), isin=str(f["ISIN"] or ""),
        importe_eur=numero_es(f["Importe EUR"]), descripcion=str(f["Descripción"] or ""),
        fuente=fuente, cliente=str(f["Cliente"])) for f in _hoja(libro, "Movimientos")]
    historial = {}
    for f in _hoja(libro, "Historial"):
        marca = f["Marca de agua"]
        historial[str(f["Cliente"])] = Historial(
            cliente=str(f["Cliente"]), patrimonio_inicio=numero_es(f["Patrimonio inicio periodo"]),
            marca_agua=numero_es(marca) if marca not in (None, "") else None)
    return posiciones, movimientos, historial
