"""Genera demo/index.html: la plantilla con los datos ficticios ya leídos por los lectores del prototipo.

    python3 demo/construir.py
"""
import json
from pathlib import Path
import sys

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from ejecutar import leer_fuentes  # noqa: E402


def posicion(p):
    return {"cliente": p.cliente, "cuenta": p.cuenta, "isin": p.isin, "nombre": p.nombre, "titulos": str(p.titulos),
            "precio": str(p.precio), "divisa": p.divisa, "cambio": str(p.tipo_cambio), "valor": str(p.valor_eur),
            "fuente": p.fuente}


def movimiento(m):
    return {"cliente": m.cliente, "cuenta": m.cuenta, "fecha": m.fecha.isoformat(), "tipo": m.tipo, "isin": m.isin,
            "importe": str(m.importe_eur), "concepto": m.descripcion, "fuente": m.fuente}


def main():
    cfg = json.loads((RAIZ / "config.json").read_text(encoding="utf-8"))
    contratos = json.loads((RAIZ / cfg["fuentes"]["contratos"]).read_text(encoding="utf-8"))
    fuentes, _ = leer_fuentes(cfg, {c: k["cliente"] for k in contratos for c in k["cuentas"]})
    datos = {
        "posBanco": [posicion(p) for p in fuentes.posiciones_banco],
        "posInterno": [posicion(p) for p in fuentes.posiciones_internas],
        "movBanco": [movimiento(m) for m in fuentes.movimientos_banco],
        "movInterno": [movimiento(m) for m in fuentes.movimientos_internos],
        "historial": {k: {"inicio": str(h.patrimonio_inicio), "marca": None if h.marca_agua is None else str(h.marca_agua)}
                      for k, h in fuentes.historial.items()},
        "contratos": contratos,
    }
    plantilla = (RAIZ / "demo" / "plantilla.html").read_text(encoding="utf-8")
    texto = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
    (RAIZ / "demo" / "index.html").write_text(plantilla.replace("__DATOS__", texto), encoding="utf-8")
    print("demo/index.html generado")


if __name__ == "__main__":
    main()
