"""
Combina los dos indicadores de presión vial en un solo valor por comuna, para el día y para la noche.

Indicadores (calculados antes):
- Red vial: km de autopistas y avenidas por km²
  (datasets_procesados/osm_vias_principales_caba__presion_vial_por_comuna.csv)
- Colectivos: pasadas de colectivo por hora y por km², de día y de noche
  (datasets_procesados/colectivos-gtfs__pasadas_por_comuna_dia_noche.csv)

Método:
1. Cada indicador se expresa relativo al promedio de toda la Ciudad (total de CABA / superficie
   de CABA). Ej.: 1,25 = 25 % más que el promedio de la Ciudad. Así se pueden combinar
   indicadores con unidades distintas sin pasarlos a una escala 0-100.
2. Presión vial = 50 % red vial + 50 % colectivos (mismo peso).
   - Día:   0,5 × red_vial_rel + 0,5 × colectivos_dia_rel
   - Noche: 0,5 × red_vial_rel + 0,5 × colectivos_noche_rel
   (La red vial no cambia entre día y noche; los colectivos sí.)
3. El resultado también se informa como porcentaje sobre o bajo el promedio de la Ciudad.

Uso:
python codigo/presion_vial_combinada.py \
    datasets_procesados/osm_vias_principales_caba__presion_vial_por_comuna.csv \
    datasets_procesados/colectivos-gtfs__pasadas_por_comuna_dia_noche.csv \
    datasets_procesados/osm_vias_principales_caba__presion_vial_combinada_con_colectivos.csv
"""
import csv, sys

PESO_RED_VIAL, PESO_COLECTIVOS = 0.5, 0.5
osm_path, col_path, out_path = sys.argv[1:4]
osm = {int(r["comuna"]): r for r in csv.DictReader(open(osm_path, encoding="utf-8"))}
col = {int(r["comuna"]): r for r in csv.DictReader(open(col_path, encoding="utf-8"))}

sup_caba = sum(float(r["sup_comuna_km2"]) for r in osm.values())
prom_red = sum(float(r["km_total"]) for r in osm.values()) / sup_caba
prom_dia = sum(int(r["pasadas_dia"]) for r in col.values()) / sup_caba / 15     # 15 h de día
prom_noche = sum(int(r["pasadas_noche"]) for r in col.values()) / sup_caba / 9  # 9 h de noche

cols = ["comuna", "red_vial_km_por_km2", "colectivos_dia_por_hora_km2", "colectivos_noche_por_hora_km2",
        "red_vial_rel", "colectivos_dia_rel", "colectivos_noche_rel",
        "presion_vial_dia", "presion_vial_noche", "presion_vial_dia_vs_caba_pct",
        "presion_vial_noche_vs_caba_pct"]
with open(out_path, "w", newline="", encoding="utf-8") as fo:
    w = csv.writer(fo); w.writerow(cols)
    for n in sorted(osm):
        sup = float(osm[n]["sup_comuna_km2"])
        red = float(osm[n]["km_total"]) / sup
        dia = int(col[n]["pasadas_dia"]) / sup / 15
        noche = int(col[n]["pasadas_noche"]) / sup / 9
        r_red, r_dia, r_noche = red / prom_red, dia / prom_dia, noche / prom_noche
        pv_dia = PESO_RED_VIAL * r_red + PESO_COLECTIVOS * r_dia
        pv_noche = PESO_RED_VIAL * r_red + PESO_COLECTIVOS * r_noche
        w.writerow([n, round(red, 2), round(dia), round(noche), round(r_red, 2), round(r_dia, 2),
                    round(r_noche, 2), round(pv_dia, 2), round(pv_noche, 2),
                    round(100 * (pv_dia - 1)), round(100 * (pv_noche - 1))])
print(f"Promedios CABA: red vial {prom_red:.2f} km/km² | colectivos día {prom_dia:.0f} y noche {prom_noche:.0f} pasadas/h/km²")
print(open(out_path, encoding="utf-8").read())
