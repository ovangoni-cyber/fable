"""Cálculo de honorarios según las condiciones de cada contrato.

Cada cálculo guarda un desglose en texto para que cualquiera pueda comprobar
de dónde sale la cifra antes de aprobar la factura.
"""
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from .modelo import Historial, euros, formato_eur


@dataclass
class Periodo:
    nombre: str  # "3T 2026"
    inicio: date
    fin: date

    @property
    def dias(self) -> int:
        return (self.fin - self.inicio).days + 1

    @property
    def periodos_por_anio(self) -> int:
        """4 para un trimestre, 12 para un mes, según los meses que abarca."""
        meses = (self.fin.year - self.inicio.year) * 12 + self.fin.month - self.inicio.month + 1
        return 12 // meses


@dataclass
class Linea:
    concepto: str
    importe: Decimal


@dataclass
class Calculo:
    cliente: str
    nombre: str
    patrimonio: Decimal
    lineas: list[Linea] = field(default_factory=list)
    desglose: list[str] = field(default_factory=list)
    iva_pct: Decimal = Decimal(21)
    nueva_marca_agua: Decimal | None = None

    @property
    def base_imponible(self) -> Decimal:
        return euros(sum((l.importe for l in self.lineas), Decimal(0)))

    @property
    def cuota_iva(self) -> Decimal:
        return euros(self.base_imponible * self.iva_pct / 100)

    @property
    def total(self) -> Decimal:
        return self.base_imponible + self.cuota_iva


def _pct(valor) -> str:
    return f"{Decimal(str(valor)):.2f}".replace(".", ",") + " %"


def comision_anual(patrimonio: Decimal, regla: dict) -> tuple[Decimal, list[str]]:
    """Comisión de gestión anualizada: porcentaje fijo o tramos marginales."""
    if regla["tipo"] == "fijo":
        pct = Decimal(str(regla["pct"]))
        importe = patrimonio * pct / 100
        return importe, [f"{formato_eur(patrimonio)} × {_pct(pct)} = {formato_eur(importe)} anual"]
    if regla["tipo"] == "tramos":
        importe, lineas, desde = Decimal(0), [], Decimal(0)
        for tramo in regla["tramos"]:
            hasta = Decimal(str(tramo["hasta"])) if tramo["hasta"] is not None else None
            pct = Decimal(str(tramo["pct"]))
            tope = patrimonio if hasta is None else min(patrimonio, hasta)
            if tope <= desde:
                break
            parte = (tope - desde) * pct / 100
            rango = f"de {formato_eur(desde)} a {formato_eur(hasta)}" if hasta else f"más de {formato_eur(desde)}"
            lineas.append(f"Tramo {rango}: {formato_eur(tope - desde)} × {_pct(pct)} = {formato_eur(parte)}")
            importe += parte
            if hasta is None:
                break
            desde = hasta
        lineas.append(f"Total anual por tramos: {formato_eur(importe)}")
        return importe, lineas
    raise ValueError(f"Tipo de comisión desconocido: {regla['tipo']!r}")


def dias_activos(contrato: dict, periodo: Periodo) -> int:
    alta = date.fromisoformat(contrato["fecha_alta"])
    baja = date.fromisoformat(contrato["fecha_baja"]) if contrato.get("fecha_baja") else None
    desde = max(alta, periodo.inicio)
    hasta = min(baja, periodo.fin) if baja else periodo.fin
    return max(0, (hasta - desde).days + 1)


def calcular(contrato: dict, periodo: Periodo, patrimonio: Decimal,
             historial: Historial | None, flujos: Decimal) -> Calculo:
    calc = Calculo(cliente=contrato["cliente"], nombre=contrato["nombre"], patrimonio=patrimonio,
                   iva_pct=Decimal(str(contrato.get("iva_pct", 21))))
    d = calc.desglose
    regla = contrato["comision_gestion"]

    # 1. Comisión de gestión
    d.append(f"Patrimonio validado por el banco a {periodo.fin:%d/%m/%Y}: {formato_eur(patrimonio)}")
    anual, lineas = comision_anual(patrimonio, regla)
    d += lineas
    dias = dias_activos(contrato, periodo)
    prorrata = Decimal(dias) / Decimal(periodo.dias)
    gestion = anual / periodo.periodos_por_anio
    d.append(f"Parte del periodo ({periodo.nombre}): {formato_eur(anual)} / {periodo.periodos_por_anio} = {formato_eur(gestion)}")
    if dias < periodo.dias:
        gestion *= prorrata
        d.append(f"Prorrateo por alta o baja en el periodo: {dias} de {periodo.dias} días = {formato_eur(gestion)}")
    gestion = euros(gestion)
    calc.lineas.append(Linea(f"Comisión de gestión {periodo.nombre}", gestion))

    if regla.get("descuento_pct"):
        pct = Decimal(str(regla["descuento_pct"]))
        descuento = -euros(gestion * pct / 100)
        motivo = regla.get("descuento_motivo", "Descuento")
        d.append(f"{motivo}: {_pct(pct)} sobre {formato_eur(gestion)} = {formato_eur(descuento)}")
        calc.lineas.append(Linea(f"{motivo} ({_pct(pct)})", descuento))

    if regla.get("minimo_periodo"):
        minimo = euros(Decimal(str(regla["minimo_periodo"])) * prorrata)
        neto = sum((l.importe for l in calc.lineas), Decimal(0))
        if neto < minimo:
            ajuste = minimo - neto
            d.append(f"Mínimo del periodo {formato_eur(minimo)} > {formato_eur(neto)}: se añade un ajuste de {formato_eur(ajuste)}")
            calc.lineas.append(Linea("Ajuste a comisión mínima", ajuste))
        else:
            d.append(f"Mínimo del periodo ({formato_eur(minimo)}) cubierto")

    # 2. Comisión de éxito sobre la rentabilidad, con marca de agua
    exito = contrato.get("comision_exito")
    if exito:
        if historial is None:
            raise ValueError(f"{contrato['cliente']}: falta el historial para calcular la comisión de éxito")
        pct = Decimal(str(exito["pct"]))
        inicio = historial.patrimonio_inicio
        marca = historial.marca_agua if exito.get("marca_agua") and historial.marca_agua else inicio
        referencia = max(inicio, marca) + flujos
        ganancia = max(Decimal(0), patrimonio - referencia)
        d.append(f"Comisión de éxito: patrimonio inicial {formato_eur(inicio)}, marca de agua {formato_eur(marca)}, "
                 f"aportaciones netas {formato_eur(flujos)}")
        d.append(f"Referencia = máx(inicial, marca de agua) + aportaciones netas = {formato_eur(referencia)}")
        if ganancia > 0:
            importe = euros(ganancia * pct / 100)
            d.append(f"Ganancia sobre la referencia: {formato_eur(ganancia)} × {_pct(pct)} = {formato_eur(importe)}")
            calc.lineas.append(Linea(f"Comisión de éxito {periodo.nombre} ({_pct(pct)} s/ {formato_eur(ganancia)})", importe))
        else:
            d.append("No se supera la referencia: sin comisión de éxito")
        calc.nueva_marca_agua = euros(max(referencia, patrimonio))
        d.append(f"Nueva marca de agua para el próximo periodo: {formato_eur(calc.nueva_marca_agua)}")

    d.append(f"Base imponible {formato_eur(calc.base_imponible)} + IVA {_pct(calc.iva_pct)} "
             f"{formato_eur(calc.cuota_iva)} = {formato_eur(calc.total)}")
    return calc
