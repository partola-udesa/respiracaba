// Complemento de la red peatonal: parques, reservas y jardines que en OSM están cargados como
// relaciones (multipolígonos), como los Bosques de Palermo, la Reserva Ecológica Costanera Sur o el Rosedal.
// También trae reservas y jardines cargados como vías cerradas, que la primera descarga no incluía.
[out:json][timeout:300];
area["boundary"="administrative"]["admin_level"="4"]["name"~"Ciudad Autónoma de Buenos Aires"]->.a;
(
  relation(area.a)["leisure"~"^(park|nature_reserve|garden)$"];
  way(area.a)["leisure"~"^(nature_reserve|garden)$"];
);
out geom;  // "out geom" (no "out tags geom"): así trae los miembros de cada relación con su geometría
