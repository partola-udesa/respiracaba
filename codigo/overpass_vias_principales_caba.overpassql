[out:json][timeout:120];
area["boundary"="administrative"]["admin_level"="4"]["name"~"Ciudad Autónoma de Buenos Aires"]->.a;
way(area.a)["highway"~"^(motorway|trunk|primary|secondary|motorway_link|trunk_link|primary_link|secondary_link)$"];
out tags geom;
