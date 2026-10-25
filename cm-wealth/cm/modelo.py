"""Formato común: todas las fuentes (PDF, CSV, Excel) se traducen a estas estructuras."""
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
import re

EFECTIVO = "EFECTIVO"
CENTIMO = Decimal("0.01")


def euros(valor) -> Decimal:
    """Redondea a céntimos (redondeo comercial)."""
    return Decimal(valor).quantize(CENTIMO, rounding=ROUND_HALF_UP)


def numero_es(texto) -> Decimal:
    """Convierte '1.234,56' o '-25.200,00' (formato español) en Decimal."""
    if isinstance(texto, (int, float, Decimal)):
        return Decimal(str(texto))
    limpio = re.sub(r"[^\d,.\-]", "", str(texto))
    return Decimal(limpio.replace(".", "").replace(",", "."))


def fecha_es(texto) -> date:
    """Convierte '30/09/2026' en date."""
    if isinstance(texto, date):
        return texto
    d, m, a = str(texto).strip().split("/")
    return date(int(a), int(m), int(d))


def formato_num(valor: Decimal, decimales: int | None = None) -> str:
    """Decimal → '1.234,5678' (sin ceros sobrantes si no se indican decimales)."""
    valor = Decimal(valor)
    if decimales is None:
        valor = valor.normalize()
        decimales = max(0, -valor.as_tuple().exponent)
    s = f"{valor:,.{decimales}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def formato_eur(valor: Decimal) -> str:
    """Decimal → '1.234,56 €'."""
    return formato_num(euros(valor), 2) + " €"


@dataclass
class Posicion:
    cuenta: str
    isin: str
    nombre: str
    titulos: Decimal
    precio: Decimal
    divisa: str
    tipo_cambio: Decimal  # unidades de divisa por 1 EUR (1 para EUR)
    valor_eur: Decimal
    fecha: date
    fuente: str
    cliente: str = ""


@dataclass
class Movimiento:
    cuenta: str
    fecha: date
    tipo: str  # APORTACION, RETIRADA, COMPRA, VENTA, DIVIDENDO, COMISION
    isin: str
    importe_eur: Decimal  # positivo: entra efectivo; negativo: sale
    descripcion: str
    fuente: str
    cliente: str = ""


# Movimientos que son dinero que el cliente mete o saca (no rentabilidad).
FLUJOS_EXTERNOS = {"APORTACION", "RETIRADA"}


@dataclass
class Incidencia:
    cliente: str
    cuenta: str
    tipo: str
    severidad: str  # alta, media
    descripcion: str
    isin: str = ""
    valor_banco: Decimal | None = None
    valor_interno: Decimal | None = None
    accion: str = ""

    @property
    def diferencia(self) -> Decimal | None:
        if self.valor_banco is None or self.valor_interno is None:
            return None
        return self.valor_banco - self.valor_interno


@dataclass
class Historial:
    cliente: str
    patrimonio_inicio: Decimal
    marca_agua: Decimal | None


@dataclass
class Fuentes:
    """Lo que llega de todas las fuentes, ya en formato común."""
    posiciones_banco: list[Posicion] = field(default_factory=list)
    movimientos_banco: list[Movimiento] = field(default_factory=list)
    posiciones_internas: list[Posicion] = field(default_factory=list)
    movimientos_internos: list[Movimiento] = field(default_factory=list)
    historial: dict[str, Historial] = field(default_factory=dict)
