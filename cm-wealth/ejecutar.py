"""Proceso completo del periodo: leer fuentes → conciliar → calcular comisiones → facturas e informe.

    python3 ejecutar.py            (usa config.json)
    python3 ejecutar.py otra.json
"""
from datetime import date
from decimal import Decimal
import json
from pathlib import Path
import sys

from cm import comisiones, conciliacion, facturas, informe, lectores
from cm.modelo import Fuentes, Incidencia, formato_eur

RAIZ = Path(__file__).parent


def leer_fuentes(cfg: dict, cuenta_cliente: dict[str, str]) -> tuple[Fuentes, list[Incidencia]]:
    f = {k: RAIZ / v for k, v in cfg["fuentes"].items()}
    fuentes = Fuentes()
    pos, mov = lectores.leer_pdf_banco_atlantico(f["banco_atlantico_pdf"])
    fuentes.posiciones_banco += pos
    fuentes.movimientos_banco += mov
    pos, mov = lectores.leer_csv_banco_meridional(f["banco_meridional_posiciones_csv"],
                                                  f["banco_meridional_movimientos_csv"])
    fuentes.posiciones_banco += pos
    fuentes.movimientos_banco += mov
    (fuentes.posiciones_internas, fuentes.movimientos_internos,
     fuentes.historial) = lectores.leer_excel_interno(f["excel_interno"])

    incidencias = []
    for registro in (fuentes.posiciones_banco + fuentes.movimientos_banco
                     + fuentes.posiciones_internas + fuentes.movimientos_internos):
        cliente = cuenta_cliente.get(registro.cuenta)
        if cliente is None:
            incidencias.append(Incidencia("—", registro.cuenta, "Cuenta sin contrato", "alta",
                                          f"La cuenta {registro.cuenta} ({registro.fuente}) no está en ningún contrato.",
                                          accion="Añadir la cuenta al contrato del cliente."))
        registro.cliente = cliente or "—"
    return fuentes, incidencias


def main(ruta_config: Path):
    cfg = json.loads(ruta_config.read_text(encoding="utf-8"))
    contratos = json.loads((RAIZ / cfg["fuentes"]["contratos"]).read_text(encoding="utf-8"))
    cuenta_cliente = {c: k["cliente"] for k in contratos for c in k["cuentas"]}
    p = cfg["periodo"]
    periodo = comisiones.Periodo(p["nombre"], date.fromisoformat(p["inicio"]), date.fromisoformat(p["fin"]))
    salida = RAIZ / "salida" / periodo.nombre.replace(" ", "")
    (salida / "facturas").mkdir(parents=True, exist_ok=True)

    # 1. Conciliación
    fuentes, incidencias = leer_fuentes(cfg, cuenta_cliente)
    tol_eur, tol_pct = Decimal(str(cfg["tolerancia_eur"])), Decimal(str(cfg["tolerancia_pct"]))
    incidencias += conciliacion.conciliar_posiciones(fuentes.posiciones_banco, fuentes.posiciones_internas,
                                                     tol_eur, tol_pct)
    incidencias += conciliacion.conciliar_movimientos(fuentes.movimientos_banco, fuentes.movimientos_internos)
    patrimonio = conciliacion.patrimonio_validado(fuentes.posiciones_banco)
    flujos = conciliacion.flujos_netos(fuentes.movimientos_banco)

    # 2. Comisiones y facturas
    calculos, estados, numeros, export = [], {}, {}, []
    fecha_emision = date.fromisoformat(cfg["fecha_emision"])
    for n, contrato in enumerate(contratos, start=1):
        cliente = contrato["cliente"]
        if cliente not in patrimonio:
            incidencias.append(Incidencia(cliente, "", "Sin datos del banco", "alta",
                                          "No hay posiciones del banco para este cliente: no se puede facturar."))
            continue
        calc = comisiones.calcular(contrato, periodo, patrimonio[cliente], fuentes.historial.get(cliente),
                                   flujos.get(cliente, Decimal(0)))
        propias = [i for i in incidencias if i.cliente == cliente]
        altas = sum(i.severidad == "alta" for i in propias)
        estado = "Revisar antes de facturar" if altas else "Lista para aprobar"
        avisos = []
        if propias:
            avisos.append(f"{len(propias)} incidencia(s) de conciliación ({altas} alta(s)). El importe se calcula con "
                          "los datos del banco, pero conviene revisarlas antes de aprobar.")
        avisos.append("Numeración provisional: el número definitivo lo asigna el programa de facturación.")
        numero = f"B-{periodo.nombre.replace(' ', '')}-{n:03d}"
        facturas.factura_pdf(salida / "facturas" / f"{numero}_{cliente}.pdf", numero, calc, contrato, cfg["emisor"],
                             periodo, fecha_emision, estado, avisos)
        calculos.append(calc)
        estados[cliente], numeros[cliente] = estado, numero
        export.append({"numero_borrador": numero, "fecha": f"{fecha_emision:%d/%m/%Y}", "cliente": calc.nombre,
                       "nif": contrato["nif"], "concepto": "; ".join(l.concepto for l in calc.lineas),
                       "base_imponible": calc.base_imponible, "tipo_iva": calc.iva_pct,
                       "cuota_iva": calc.cuota_iva, "total": calc.total, "estado": estado})

    facturas.exportar_csv(salida / f"facturas_{periodo.nombre.replace(' ', '')}_para_contabilidad.csv", export)
    informe.generar(salida / f"informe_{periodo.nombre.replace(' ', '')}.xlsx", periodo.nombre, calculos, estados,
                    incidencias, fuentes.posiciones_banco, fuentes.movimientos_banco, numeros)

    print(f"Periodo {periodo.nombre}: {len(fuentes.posiciones_banco)} posiciones y "
          f"{len(fuentes.movimientos_banco)} movimientos del banco leídos")
    print(f"Incidencias: {len(incidencias)} ({sum(i.severidad == 'alta' for i in incidencias)} altas)")
    for c in calculos:
        print(f"  {c.cliente} {c.nombre:<26} patrimonio {formato_eur(c.patrimonio):>16}   "
              f"factura {formato_eur(c.total):>12}   {estados[c.cliente]}")
    print(f"Resultados en {salida.relative_to(RAIZ)}/")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "config.json")
