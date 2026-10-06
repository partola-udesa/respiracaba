# RESPIRA

Web app que ayuda a familias a decidir dónde comprar o alquilar en la Ciudad de Buenos Aires. Combina un **índice de respirabilidad** (calidad del aire, verde y arbolado, menos tránsito y ruido) con el **precio del m²** y la **natalidad por comuna**. Siempre distingue el *dato duro*, calculado a partir de los datasets, de la *inferencia del LLM*.

**Materia:** IA Aplicada al diseño de productos digitales (Sistemas generativos para Diseño)

## Hipótesis
Podemos predecir el valor de los inmuebles según su cantidad de ambientes a partir de la tasa de natalidad de las comunas y del índice de respirabilidad de la zona.

## Integrantes
- Paulina Artola
- Emma Sangra
- Malena Sciaroni Bouer

## Sitio
🔗 _link a Netlify (completar)_

![Captura de la app](entregas/entrega_1/captura.png)
<!-- reemplazar por la captura más reciente -->

## Fuentes de datos
El detalle de cada dataset (columnas, unidades y transformaciones) está en [`datasets/diccionario.md`](datasets/diccionario.md).

| Dataset | Fuente | Link | Fecha de descarga |
|---|---|---|---|
| NO2 por comuna (mensual) y por estación (diario) | Copernicus Sentinel-5P vía Google Earth Engine | _colección GEE (completar)_ | AAAA-MM-DD |
| Meteorología ERA5 | ECMWF ERA5 vía Google Earth Engine | _colección GEE (completar)_ | AAAA-MM-DD |
| Arbolado público lineal 2017–2018 ⚠️ | GCBA – Buenos Aires Data | https://cdn.buenosaires.gob.ar/datosabiertos/datasets/atencion-ciudadana/arbolado-publico-lineal/arbolado-publico-lineal-2017-2018.csv | AAAA-MM-DD |
| Arbolado en espacios verdes | GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/arbolado-espacios-verdes | AAAA-MM-DD |
| Conteo vehicular | GCBA – Buenos Aires Data | https://data.buenosaires.gob.ar/dataset/conteo-vehicular | AAAA-MM-DD |
| Precio m² venta 2 amb. usados por barrio (MI_DVP_AX03) | IDECBA | _completar_ | AAAA-MM-DD |
| Precio m² venta 3 amb. usados por comuna (MI_DVP_AX08) | IDECBA | _completar_ | AAAA-MM-DD |
| Nacimientos por comuna (Nac_Co) | IDECBA | https://www.estadisticaciudad.gob.ar/eyc/?p=59650 | AAAA-MM-DD |

⚠️ **Archivos pesados que no están en el repo:** `arbolado-publico-lineal-2017-2018.csv` pesa 60 MB. Se descarga del link de la tabla y se guarda en `datasets/` con ese mismo nombre.

## Cómo reproducir los datos procesados
```bash
pip install openpyxl
python codigo/convertir_xlsx_a_csv.py
```

## Estructura del repositorio
| Carpeta | Contenido |
|---|---|
| `datasets/` | Datos originales con el nombre de descarga, más `diccionario.md` |
| `datasets_procesados/` | Versiones recortadas o reorganizadas (`original__transformacion.csv`) |
| `codigo/` | Scripts de descarga, conversión y limpieza |
| `prompts/` | Prompts del LLM, versionados (`prompt_x_v1.md`, `_v2`…) |
| `diseno/` | Referencias y prototipos |
| `entregas/` | Estado del proyecto en cada entrega |
| `app/` | Lo que se publica en Netlify |
