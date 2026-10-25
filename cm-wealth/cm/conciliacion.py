"""Cruza lo que dice el banco con el registro interno y anota cada diferencia.

El banco (custodio) es la fuente de verdad del patrimonio: el registro interno
se corrige, no al revés.
"""
from collections import defaultdict
from decimal import Decimal

from .modelo import EFECTIVO, FLUJOS_EXTERNOS, Incidencia, Movimiento, Posicion, euros, formato_eur, formato_num

DIAS_MARGEN_MOVIMIENTOS = 3


def _supera_tolerancia(banco: Decimal, interno: Decimal, tol_eur: Decimal, tol_pct: Decimal) -> bool:
    limite = max(tol_eur, abs(banco) * tol_pct / 100)
    return abs(banco - interno) > limite


def conciliar_posiciones(banco: list[Posicion], interno: list[Posicion],
                         tol_eur: Decimal, tol_pct: Decimal) -> list[Incidencia]:
    incidencias = []
    por_banco = {(p.cuenta, p.isin): p for p in banco}
    por_interno = {(p.cuenta, p.isin): p for p in interno}
    for clave in sorted(set(por_banco) | set(por_interno)):
        b, i = por_banco.get(clave), por_interno.get(clave)
        cliente = (b or i).cliente
        cuenta, isin = clave
        if b and not i:
            incidencias.append(Incidencia(
                cliente, cuenta, "Posición no registrada", "alta",
                f"{b.nombre}: el banco tiene {formato_num(b.titulos)} títulos ({formato_eur(b.valor_eur)}) "
                "que no figuran en el registro interno.",
                isin=isin, valor_banco=b.valor_eur, valor_interno=Decimal(0),
                accion="Buscar la operación de compra y darla de alta en el registro interno."))
        elif i and not b:
            incidencias.append(Incidencia(
                cliente, cuenta, "Posición inexistente en el banco", "alta",
                f"{i.nombre}: el registro interno tiene {formato_num(i.titulos)} títulos que el banco no reporta.",
                isin=isin, valor_banco=Decimal(0), valor_interno=i.valor_eur,
                accion="Comprobar si se vendió o traspasó y dar de baja la posición."))
        elif isin == EFECTIVO:
            if _supera_tolerancia(b.valor_eur, i.valor_eur, tol_eur, tol_pct):
                incidencias.append(Incidencia(
                    cliente, cuenta, "Saldo de efectivo distinto", "alta",
                    f"Efectivo: banco {formato_eur(b.valor_eur)}, interno {formato_eur(i.valor_eur)}. "
                    "Suele deberse a movimientos sin registrar.",
                    isin=isin, valor_banco=b.valor_eur, valor_interno=i.valor_eur,
                    accion="Revisar los movimientos no registrados de esta cuenta."))
        elif b.titulos != i.titulos:
            incidencias.append(Incidencia(
                cliente, cuenta, "Títulos distintos", "alta",
                f"{b.nombre}: banco {formato_num(b.titulos)} títulos, interno {formato_num(i.titulos)}.",
                isin=isin, valor_banco=b.valor_eur, valor_interno=i.valor_eur,
                accion="Buscar la compra o venta parcial que falta en el registro interno."))
        elif _supera_tolerancia(b.valor_eur, i.valor_eur, tol_eur, tol_pct):
            causas = []
            if b.precio != i.precio:
                causas.append(f"precio banco {formato_num(b.precio)} vs interno {formato_num(i.precio)} (¿precio desactualizado?)")
            if b.tipo_cambio != i.tipo_cambio:
                causas.append(f"tipo de cambio banco {formato_num(b.tipo_cambio)} vs interno {formato_num(i.tipo_cambio)}")
            incidencias.append(Incidencia(
                cliente, cuenta, "Diferencia de valoración", "media",
                f"{b.nombre}: " + ("; ".join(causas) or "valor distinto con mismo precio y títulos") + ".",
                isin=isin, valor_banco=b.valor_eur, valor_interno=i.valor_eur,
                accion="Actualizar el precio o el tipo de cambio en el registro interno."))
    return incidencias


def _emparejar(origen: list[Movimiento], destino: list[Movimiento]) -> list[Movimiento]:
    """Devuelve los movimientos de `origen` sin pareja en `destino`.

    Pareja = misma cuenta, tipo e importe, con fecha a ±3 días (el banco y la
    gestora a veces anotan la fecha de operación y la de liquidación).
    """
    libres = defaultdict(list)
    for m in destino:
        libres[(m.cuenta, m.tipo, euros(m.importe_eur))].append(m)
    sin_pareja = []
    for m in sorted(origen, key=lambda x: x.fecha):
        candidatos = libres[(m.cuenta, m.tipo, euros(m.importe_eur))]
        pareja = next((c for c in candidatos
                       if abs((c.fecha - m.fecha).days) <= DIAS_MARGEN_MOVIMIENTOS), None)
        if pareja:
            candidatos.remove(pareja)
        else:
            sin_pareja.append(m)
    return sin_pareja


def conciliar_movimientos(banco: list[Movimiento], interno: list[Movimiento]) -> list[Incidencia]:
    incidencias = []
    for m in _emparejar(banco, interno):
        incidencias.append(Incidencia(
            m.cliente, m.cuenta, "Movimiento no registrado", "alta",
            f"{m.fecha:%d/%m/%Y} {m.descripcion} {m.isin} por {formato_eur(m.importe_eur)} "
            "aparece en el banco pero no en el registro interno.",
            isin=m.isin, valor_banco=m.importe_eur, valor_interno=Decimal(0),
            accion="Registrar el movimiento en el Excel interno."))
    for m in _emparejar(interno, banco):
        incidencias.append(Incidencia(
            m.cliente, m.cuenta, "Movimiento sin reflejo en el banco", "alta",
            f"{m.fecha:%d/%m/%Y} {m.descripcion} {m.isin} por {formato_eur(m.importe_eur)} "
            "figura en el registro interno pero no en el banco.",
            isin=m.isin, valor_banco=Decimal(0), valor_interno=m.importe_eur,
            accion="Confirmar con el banco si la operación se ejecutó."))
    return incidencias


def patrimonio_validado(banco: list[Posicion]) -> dict[str, Decimal]:
    """Patrimonio por cliente según el banco: la base para facturar."""
    total = defaultdict(Decimal)
    for p in banco:
        total[p.cliente] += p.valor_eur
    return {c: euros(v) for c, v in total.items()}


def flujos_netos(movimientos: list[Movimiento]) -> dict[str, Decimal]:
    """Aportaciones menos retiradas del periodo, por cliente (para la comisión de éxito)."""
    total = defaultdict(Decimal)
    for m in movimientos:
        if m.tipo in FLUJOS_EXTERNOS:
            total[m.cliente] += m.importe_eur
    return dict(total)
