# CM Wealth Managers · Conciliación y comisiones (prototipo)

Prototipo con **datos ficticios** de dos automatizaciones encadenadas:

1. **Conciliación.** Lee los extractos del banco (PDF y CSV) y el registro interno (Excel), los pasa a un formato común y anota cada diferencia.
2. **Facturación de comisiones.** Calcula los honorarios de cada cliente según su contrato, sobre el patrimonio validado por el banco, y prepara las facturas en borrador.

```
datos/                         salida/3T2026/
  PDF Banco Atlántico   ─┐       informe_3T2026.xlsx       resumen, incidencias, cálculo paso a paso
  CSV Banco Meridional  ─┼─▶      facturas/B-3T2026-00N_*.pdf   facturas en borrador con el detalle del cálculo
  cartera_interna.xlsx  ─┤       facturas_3T2026_para_contabilidad.csv   para importar en el programa de facturación
  contratos.json        ─┘
```

## Demo web

`demo/index.html` es una versión interactiva para enseñar el prototipo: resumen del cierre, incidencias que se marcan como resueltas, condiciones de cada contrato editables con recálculo al momento, aprobación de facturas y descarga del PDF y del CSV. Funciona abriendo el archivo en el navegador (sin las descargas) y se publica como página con enlace.

Se genera a partir de `demo/plantilla.html` con los datos que leen los lectores del prototipo:

```bash
python3 demo/construir.py
```

El cálculo de la página es el mismo que el de `cm/` y da las mismas cifras.

## Cómo se usa

```bash
pip install -r requirements.txt
python3 generar_datos.py      # crea los datos ficticios en datos/
python3 ejecutar.py           # conciliación + comisiones + facturas → salida/
python3 -m unittest discover -s tests -t .
```

El periodo, la fecha de emisión, las tolerancias y las rutas de las fuentes están en `config.json`.

## Qué hace

**Conciliación** (`cm/conciliacion.py`). El banco es la fuente de verdad: el registro interno se corrige, no al revés.

| Incidencia | Severidad | Ejemplo en los datos |
| --- | --- | --- |
| Posición en el banco que no está en el registro interno | alta | C001: ETF Mundo comprado el 12/09 |
| Títulos distintos | alta | C002: venta parcial de Banca Levante sin registrar |
| Saldo de efectivo distinto | alta | C001 y C002: consecuencia de lo anterior |
| Movimiento no registrado (o sin reflejo en el banco) | alta | C001: dividendo de julio |
| Diferencia de valoración por precio o tipo de cambio | media | C001: precio antiguo del Euro Bond Fund |

- Una diferencia solo es incidencia si supera **máx(25 €, 0,25 % del valor)**. Por eso la diferencia de tipo de cambio USD de C003 (39 €) no salta.
- Los movimientos se emparejan por cuenta, tipo e importe, con **±3 días** de margen en la fecha (orden frente a liquidación).

**Comisiones** (`cm/comisiones.py`). Cada contrato de `datos/contratos.json` define sus condiciones:

| Condición | Cliente de ejemplo |
| --- | --- |
| Tramos marginales (1 % hasta 500k, 0,75 % hasta 1M, 0,5 % a partir de 1M) y mínimo por periodo | C001 |
| Porcentaje fijo y **comisión de éxito** del 10 % con **marca de agua**, descontando las aportaciones | C002 |
| Porcentaje fijo, **alta a mitad de trimestre** (prorrateo por días) y descuento de bienvenida | C003 |

Cada factura lleva el **detalle del cálculo** paso a paso. Si el cliente tiene incidencias altas, la factura queda como "Revisar antes de facturar"; si no, como "Lista para aprobar". Nada se emite sin aprobación.

## Decisiones a confirmar con CM

- **Numeración y Veri\*factu.** Las facturas son borradores con numeración provisional. La propuesta es que la numeración oficial, el registro y el envío a la AEAT los haga un programa de facturación homologado, importando el CSV. Así no hay que homologar este código.
- **IVA.** Se aplica el 21 % a todas las comisiones. Hay que confirmar con el asesor fiscal el tratamiento de cada servicio.
- **Base de cálculo.** Se usa el patrimonio al cierre del periodo. Si los contratos usan la media diaria o mensual, hace falta un extracto por fecha.
- **Comisión de éxito.** Se calcula sobre el patrimonio antes de comisiones del periodo, y las aportaciones y retiradas no cuentan como rentabilidad.

## Para pasar a datos reales

1. Un lector por cada banco o custodio real (`cm/lectores.py`). Cada uno devuelve posiciones y movimientos en el formato de `cm/modelo.py`. También el lector del software de gestión.
2. Pasar los contratos reales a `contratos.json` (o leerlos de una hoja de cálculo).
3. Guardar la nueva marca de agua de cada cliente al aprobar las facturas del periodo.
4. Ejecutarlo de forma programada al recibir los extractos y enviar el informe por email.
