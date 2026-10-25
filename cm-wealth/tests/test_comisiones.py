from datetime import date
from decimal import Decimal as D
import unittest

from cm.comisiones import Periodo, calcular, comision_anual, dias_activos
from cm.modelo import Historial

TRIMESTRE = Periodo("3T 2026", date(2026, 7, 1), date(2026, 9, 30))


def contrato(**cambios):
    base = {"cliente": "X", "nombre": "Cliente", "fecha_alta": "2020-01-01",
            "comision_gestion": {"tipo": "fijo", "pct": 1}, "comision_exito": None, "iva_pct": 21}
    base.update(cambios)
    return base


class ComisionGestion(unittest.TestCase):
    def test_fijo(self):
        importe, _ = comision_anual(D(200000), {"tipo": "fijo", "pct": 0.8})
        self.assertEqual(importe, D(1600))

    def test_tramos_marginales(self):
        regla = {"tipo": "tramos", "tramos": [{"hasta": 500000, "pct": 1}, {"hasta": 1000000, "pct": 0.75},
                                              {"hasta": None, "pct": 0.5}]}
        self.assertEqual(comision_anual(D(300000), regla)[0], D(3000))
        self.assertEqual(comision_anual(D(800000), regla)[0], D(5000) + D(2250))
        self.assertEqual(comision_anual(D(1200000), regla)[0], D(5000) + D(3750) + D(1000))

    def test_trimestre_completo_e_iva(self):
        calc = calcular(contrato(), TRIMESTRE, D(400000), None, D(0))
        self.assertEqual(calc.base_imponible, D("1000.00"))
        self.assertEqual(calc.cuota_iva, D("210.00"))
        self.assertEqual(calc.total, D("1210.00"))

    def test_prorrateo_por_alta(self):
        c = contrato(fecha_alta="2026-08-15")
        self.assertEqual(dias_activos(c, TRIMESTRE), 47)
        calc = calcular(c, TRIMESTRE, D(400000), None, D(0))
        self.assertEqual(calc.base_imponible, D("510.87"))  # 1.000 × 47/92

    def test_prorrateo_por_baja(self):
        c = contrato(fecha_baja="2026-07-31")
        self.assertEqual(dias_activos(c, TRIMESTRE), 31)

    def test_minimo_se_aplica_si_no_se_alcanza(self):
        c = contrato(comision_gestion={"tipo": "fijo", "pct": 1, "minimo_periodo": 300})
        calc = calcular(c, TRIMESTRE, D(50000), None, D(0))  # 125 € < 300 €
        self.assertEqual(calc.base_imponible, D("300.00"))
        self.assertEqual(calc.lineas[-1].concepto, "Ajuste a comisión mínima")

    def test_descuento_antes_del_minimo(self):
        c = contrato(comision_gestion={"tipo": "fijo", "pct": 1, "descuento_pct": 10, "minimo_periodo": 100})
        calc = calcular(c, TRIMESTRE, D(400000), None, D(0))
        self.assertEqual(calc.base_imponible, D("900.00"))


class ComisionExito(unittest.TestCase):
    def exito(self, patrimonio, inicio, marca, flujos):
        c = contrato(comision_gestion={"tipo": "fijo", "pct": 0}, comision_exito={"pct": 10, "marca_agua": True})
        return calcular(c, TRIMESTRE, D(patrimonio), Historial("X", D(inicio), marca and D(marca)), D(flujos))

    def test_cobra_sobre_la_marca_de_agua(self):
        calc = self.exito(1100000, 1000000, 1050000, 0)
        self.assertEqual(calc.base_imponible, D("5000.00"))
        self.assertEqual(calc.nueva_marca_agua, D("1100000.00"))

    def test_las_aportaciones_no_son_rentabilidad(self):
        calc = self.exito(1100000, 1000000, None, 100000)
        self.assertEqual(calc.base_imponible, D("0.00"))

    def test_bajo_la_marca_no_cobra_y_la_mantiene(self):
        calc = self.exito(1040000, 1000000, 1050000, 20000)
        self.assertEqual(calc.base_imponible, D("0.00"))
        self.assertEqual(calc.nueva_marca_agua, D("1070000.00"))

    def test_sin_historial_avisa(self):
        c = contrato(comision_exito={"pct": 10, "marca_agua": True})
        with self.assertRaises(ValueError):
            calcular(c, TRIMESTRE, D(1000), None, D(0))


if __name__ == "__main__":
    unittest.main()
