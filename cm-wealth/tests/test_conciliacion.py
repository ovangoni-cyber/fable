from datetime import date
from decimal import Decimal as D
from pathlib import Path
import unittest

from cm import lectores
from cm.conciliacion import conciliar_movimientos, conciliar_posiciones, flujos_netos, patrimonio_validado
from cm.modelo import Movimiento, Posicion, numero_es

DATOS = Path(__file__).parent.parent / "datos"
HOY = date(2026, 9, 30)


def pos(isin, titulos, precio, valor, cambio=1):
    return Posicion("CTA", isin, isin, D(titulos), D(precio), "EUR", D(cambio), D(valor), HOY, "x", "C1")


def mov(fecha, tipo, importe):
    return Movimiento("CTA", fecha, tipo, "", D(importe), tipo, "x", "C1")


class Posiciones(unittest.TestCase):
    def conciliar(self, banco, interno):
        return conciliar_posiciones(banco, interno, D(25), D("0.25"))

    def test_iguales_sin_incidencias(self):
        self.assertEqual(self.conciliar([pos("A", 10, 5, 50)], [pos("A", 10, 5, 50)]), [])

    def test_posicion_que_falta(self):
        (inc,) = self.conciliar([pos("A", 10, 5, 50)], [])
        self.assertEqual((inc.tipo, inc.severidad), ("Posición no registrada", "alta"))

    def test_titulos_distintos(self):
        (inc,) = self.conciliar([pos("A", 10, 5, 50)], [pos("A", 12, 5, 60)])
        self.assertEqual(inc.tipo, "Títulos distintos")

    def test_diferencia_dentro_de_tolerancia(self):
        # 40 € de diferencia sobre 20.000 € (0,2 %) no supera máx(25 €, 0,25 %) = 50 €
        self.assertEqual(self.conciliar([pos("A", 100, 200, 20000)], [pos("A", 100, "199.6", 19960)]), [])

    def test_precio_desactualizado(self):
        (inc,) = self.conciliar([pos("A", 100, 200, 20000)], [pos("A", 100, 190, 19000)])
        self.assertEqual((inc.tipo, inc.severidad, inc.diferencia), ("Diferencia de valoración", "media", D(1000)))


class Movimientos(unittest.TestCase):
    def test_empareja_con_margen_de_fechas(self):
        banco = [mov(date(2026, 8, 17), "APORTACION", 1000)]
        interno = [mov(date(2026, 8, 15), "APORTACION", 1000)]
        self.assertEqual(conciliar_movimientos(banco, interno), [])

    def test_fuera_de_margen_son_dos_incidencias(self):
        banco = [mov(date(2026, 8, 30), "APORTACION", 1000)]
        interno = [mov(date(2026, 8, 15), "APORTACION", 1000)]
        tipos = sorted(i.tipo for i in conciliar_movimientos(banco, interno))
        self.assertEqual(tipos, ["Movimiento no registrado", "Movimiento sin reflejo en el banco"])

    def test_flujos_solo_aportaciones_y_retiradas(self):
        movs = [mov(HOY, "APORTACION", 1000), mov(HOY, "RETIRADA", -300), mov(HOY, "DIVIDENDO", 50)]
        self.assertEqual(flujos_netos(movs), {"C1": D(700)})


class Lectores(unittest.TestCase):
    def test_numero_es(self):
        self.assertEqual(numero_es("1.234.567,89"), D("1234567.89"))
        self.assertEqual(numero_es("-25.200,00"), D("-25200.00"))

    @unittest.skipUnless((DATOS / "banco_atlantico_extracto_2026-09-30.pdf").exists(), "ejecute generar_datos.py")
    def test_pdf_banco_atlantico(self):
        posiciones, movimientos = lectores.leer_pdf_banco_atlantico(DATOS / "banco_atlantico_extracto_2026-09-30.pdf")
        for p in posiciones:
            p.cliente = p.cuenta
        self.assertEqual(len(posiciones), 9)
        self.assertEqual(len(movimientos), 6)
        self.assertEqual(patrimonio_validado(posiciones)["ATL-10045821"], D("1084124.79"))

    @unittest.skipUnless((DATOS / "banco_meridional_posiciones_2026-09-30.csv").exists(), "ejecute generar_datos.py")
    def test_csv_banco_meridional_con_divisa(self):
        posiciones, _ = lectores.leer_csv_banco_meridional(DATOS / "banco_meridional_posiciones_2026-09-30.csv",
                                                           DATOS / "banco_meridional_movimientos_3T2026.csv")
        usd = next(p for p in posiciones if p.divisa == "USD")
        self.assertEqual(usd.valor_eur, D("21244.24"))  # 100 × 230,50 USD / 1,0850


if __name__ == "__main__":
    unittest.main()
