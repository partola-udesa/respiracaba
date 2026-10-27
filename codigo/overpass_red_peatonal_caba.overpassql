// Red de calles y sendas transitables a pie dentro de CABA (unidad común de RESPIRA: el tramo).
// Incluye calles de todo tipo, veredas, sendas peatonales, caminos de parques, escaleras y pistas.
// Excluye autopistas (motorway) y vías donde está prohibido caminar (foot=no).
// Además trae, como capa aparte, pistas de atletismo, parques y espejos de agua (para "senderos" y "cerca del agua").
[out:json][timeout:300];
area["boundary"="administrative"]["admin_level"="4"]["name"~"Ciudad Autónoma de Buenos Aires"]->.a;
(
  way(area.a)["highway"~"^(trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|pedestrian|service|footway|path|steps|track|cycleway|corridor)$"]["foot"!~"^(no|private)$"]["access"!~"^(no|private)$"];
  way(area.a)["leisure"="track"];
  way(area.a)["leisure"="park"];
  way(area.a)["natural"="water"];
  way(area.a)["natural"="coastline"];
);
out tags geom;
