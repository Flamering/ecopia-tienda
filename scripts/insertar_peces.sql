-- Insertar 23 especies de peces y sus catalogos
-- Ejecutar en Supabase SQL Editor
-- Requiere service_role key o permisos de escritura

BEGIN;

-- 1. Asegurar proveedor Ecopia
INSERT INTO proveedores (nombre_completo)
SELECT 'Ecopia'
WHERE NOT EXISTS (SELECT 1 FROM proveedores WHERE nombre_completo = 'Ecopia');

-- 2. Insertar peces (omitir si ya existen)
INSERT INTO peces (nombre_comun, nombre_cientifico, clasificacion, descripcion, imagen_url, video_url, estado, eliminado)
SELECT * FROM (VALUES
  ('Amazona Espada', 'Xiphophorus hellerii', 'Agua Dulce', 'Pez viviparo de cuerpo alargado y aleta caudal en forma de espada. Originario de Centroamerica.', 'amazon-espada/1.webp,amazon-espada/2.webp,amazon-espada/3.webp,amazon-espada/4.webp,amazon-espada/5.webp', NULL::text, 'Activo', false),
  ('Amazona Ozelot', 'Xiphophorus hellerii', 'Agua Dulce', 'Variedad de cola de espada con patron de manchas similares al ocelote.', 'amazon-ozelot/1.webp,amazon-ozelot/2.webp,amazon-ozelot/3.webp,amazon-ozelot/4.webp,amazon-ozelot/5.webp', NULL::text, 'Activo', false),
  ('Barbo Rosa Velo', 'Pethia conchonius', 'Agua Dulce', 'Pez de cardumen de cuerpo rosado y aletas velo. Originario del sur de Asia.', 'barb-rosa-velo/2.webp,barb-rosa-velo/3.webp,barb-rosa-velo/4.webp,barb-rosa-velo/5.webp,barb-rosa-velo/6.webp,barb-rosa-velo/7.webp,barb-rosa-velo/8.webp,barb-rosa-velo/9.webp', 'barb-rosa-velo/1.mp4', 'Activo', false),
  ('Cebra Amarilla', 'Danio rerio', 'Agua Dulce', 'Variedad dorada del pez cebra, de cuerpo alargado con bandas amarillas y plateadas.', 'cebra-amarilla/2.webp,cebra-amarilla/3.webp,cebra-amarilla/4.webp,cebra-amarilla/5.webp', 'cebra-amarilla/1.mp4', 'Activo', false),
  ('Cebra Roja', 'Danio rerio', 'Agua Dulce', 'Variedad roja del pez cebra, de cuerpo alargado con intensa coloracion rojiza.', 'cebra-roja/2.webp,cebra-roja/3.webp,cebra-roja/4.webp,cebra-roja/5.webp', 'cebra-roja/1.mp4', 'Activo', false),
  ('Cebra Verde', 'Danio rerio', 'Agua Dulce', 'Variedad verde del pez cebra, con tonos verdes iridiscentes en su cuerpo.', 'cebra-verde/2.webp,cebra-verde/3.webp,cebra-verde/4.webp,cebra-verde/5.webp,cebra-verde/6.webp,cebra-verde/7.webp,cebra-verde/8.webp,cebra-verde/9.webp,cebra-verde/10.webp', 'cebra-verde/1.mp4', 'Activo', false),
  ('Guppy Platino', 'Poecilia reticulata', 'Agua Dulce', 'Variedad platino del guppy, con cuerpo plateado iridiscente y aletas coloridas.', 'guppy-platino/2.webp,guppy-platino/4.webp,guppy-platino/5.webp,guppy-platino/6.webp,guppy-platino/7.webp,guppy-platino/8.webp,guppy-platino/9.webp', 'guppy-platino/1.mp4,guppy-platino/3.mp4', 'Activo', false),
  ('Gurami Azul', 'Trichogaster trichopterus', 'Agua Dulce', 'Pez laberintido de cuerpo azul plateado con tres puntos caracteristicos.', 'gurami-azul/2.webp,gurami-azul/3.webp,gurami-azul/4.webp,gurami-azul/5.webp,gurami-azul/6.webp', 'gurami-azul/1.mp4', 'Activo', false),
  ('Gurami Cosbi', 'Trichogaster trichopterus', 'Agua Dulce', 'Variedad cosby del gurami de tres puntos, con patron de manchas azuladas.', 'gurami-cosbi/2.webp,gurami-cosbi/4.webp,gurami-cosbi/6.webp,gurami-cosbi/7.webp,gurami-cosbi/8.webp', 'gurami-cosbi/1.mp4,gurami-cosbi/3.mp4,gurami-cosbi/5.mp4', 'Activo', false),
  ('Gurami Miel', 'Trichogaster chuna', 'Agua Dulce', 'Pez laberintido de color miel dorado con linea oscura horizontal.', 'gurami-miel/2.webp,gurami-miel/3.webp,gurami-miel/4.webp,gurami-miel/5.webp', 'gurami-miel/1.mp4', 'Activo', false),
  ('Molly Duke', 'Poecilia sphenops', 'Agua Dulce', 'Variedad duke del molly, de cuerpo negro azabache con aletas desarrolladas.', 'molly-duke/2.webp,molly-duke/4.webp,molly-duke/5.webp', 'molly-duke/1.mp4,molly-duke/3.mp4', 'Activo', false),
  ('Molly Plata', 'Poecilia sphenops', 'Agua Dulce', 'Molly de cuerpo plateado brillante con reflejos metalicos.', 'molly-plata/2.webp,molly-plata/3.webp,molly-plata/4.webp,molly-plata/5.webp,molly-plata/6.webp', 'molly-plata/1.mp4', 'Activo', false),
  ('Monja Albina', 'Gymnocorymbus ternetzi', 'Agua Dulce', 'Variedad albina del tetra negro, de cuerpo blanco cremoso con ojos rojos.', 'monja-albina/2.webp,monja-albina/3.webp,monja-albina/4.webp,monja-albina/5.webp,monja-albina/6.webp,monja-albina/7.webp,monja-albina/8.webp,monja-albina/9.webp', 'monja-albina/1.mp4', 'Activo', false),
  ('Monja Colores', 'Gymnocorymbus ternetzi', 'Agua Dulce', 'Variedad de colores del tetra negro, con tonalidades rosadas, naranjas y azuladas.', 'monja-colores/1.webp,monja-colores/2.webp,monja-colores/3.webp,monja-colores/4.webp,monja-colores/5.webp,monja-colores/6.webp,monja-colores/7.webp,monja-colores/8.webp,monja-colores/9.webp', NULL::text, 'Activo', false),
  ('Monja Negra', 'Gymnocorymbus ternetzi', 'Agua Dulce', 'Tetra negro de cuerpo oscuro con dos franjas verticales negras.', 'monja-negra-duda/2.webp,monja-negra-duda/3.webp,monja-negra-duda/4.webp,monja-negra-duda/5.webp,monja-negra-duda/6.webp,monja-negra-duda/7.webp,monja-negra-duda/8.webp,monja-negra-duda/9.webp,monja-negra-duda/10.webp', 'monja-negra-duda/1.mp4', 'Activo', false),
  ('Platy Abeja', 'Xiphophorus maculatus', 'Agua Dulce', 'Variedad abeja del platy, con cuerpo amarillo y bandas negras.', 'platy-abeja/2.webp,platy-abeja/3.webp,platy-abeja/4.webp,platy-abeja/5.webp,platy-abeja/6.webp,platy-abeja/7.webp', 'platy-abeja/1.mp4', 'Activo', false),
  ('Platy Arcoiris', 'Xiphophorus maculatus', 'Agua Dulce', 'Variedad arcoiris del platy, con cuerpo multicolor.', 'platy-arcoiris/2.webp,platy-arcoiris/3.webp,platy-arcoiris/4.webp,platy-arcoiris/5.webp,platy-arcoiris/6.webp', 'platy-arcoiris/1.mp4', 'Activo', false),
  ('Platy Rojo', 'Xiphophorus maculatus', 'Agua Dulce', 'Platy de intenso color rojo uniforme.', 'platy-rojo/2.webp,platy-rojo/3.webp,platy-rojo/4.webp,platy-rojo/5.webp,platy-rojo/6.webp,platy-rojo/7.webp', 'platy-rojo/1.mp4', 'Activo', false),
  ('Sumatrano Limon', 'Puntigrus tetrazona', 'Agua Dulce', 'Variedad limon del barbo de Sumatra, de cuerpo amarillo brillante con bandas negras.', 'sumatrano-limon/2.webp,sumatrano-limon/4.webp,sumatrano-limon/5.webp,sumatrano-limon/6.webp,sumatrano-limon/7.webp,sumatrano-limon/8.webp,sumatrano-limon/9.webp,sumatrano-limon/10.webp,sumatrano-limon/11.webp,sumatrano-limon/12.webp,sumatrano-limon/13.webp,sumatrano-limon/14.webp,sumatrano-limon/15.webp,sumatrano-limon/16.webp,sumatrano-limon/17.webp,sumatrano-limon/18.webp,sumatrano-limon/19.webp,sumatrano-limon/20.webp,sumatrano-limon/21.webp,sumatrano-limon/22.webp,sumatrano-limon/23.webp,sumatrano-limon/24.webp,sumatrano-limon/25.webp,sumatrano-limon/26.webp', 'sumatrano-limon/1.mp4,sumatrano-limon/3.mp4', 'Activo', false),
  ('Sumatrano Verde', 'Puntigrus tetrazona', 'Agua Dulce', 'Variedad verde del barbo de Sumatra, con cuerpo verde musgo iridiscente.', 'sumatrano-verde/2.webp,sumatrano-verde/3.webp,sumatrano-verde/4.webp,sumatrano-verde/5.webp', 'sumatrano-verde/1.mp4', 'Activo', false),
  ('Tetra Buenos Aires', 'Psalidodon anisitsi', 'Agua Dulce', 'Tetra de cuerpo plateado-verdoso con mancha romboidal en la base de la cola.', 'tetra-buenos-aires/2.webp,tetra-buenos-aires/3.webp,tetra-buenos-aires/4.webp,tetra-buenos-aires/5.webp', 'tetra-buenos-aires/1.mp4', 'Activo', false),
  ('Tetra Negro', 'Gymnocorymbus ternetzi', 'Agua Dulce', 'Tetra de cuerpo negro grisaceo con dos franjas verticales negras.', 'tetra-negro/2.webp,tetra-negro/3.webp,tetra-negro/4.webp,tetra-negro/5.webp,tetra-negro/6.webp,tetra-negro/7.webp,tetra-negro/8.webp,tetra-negro/9.webp,tetra-negro/10.webp,tetra-negro/11.webp,tetra-negro/12.webp,tetra-negro/13.webp,tetra-negro/14.webp,tetra-negro/15.webp,tetra-negro/16.webp,tetra-negro/17.webp', 'tetra-negro/1.mp4', 'Activo', false),
  ('Tetra Priestrella Roja', 'Pristella maxillaris', 'Agua Dulce', 'Pez de cuerpo semitransparente con aleta dorsal amarilla y roja, conocido como tetra rayos X.', 'tetra-priestrella-roja/2.webp,tetra-priestrella-roja/3.webp,tetra-priestrella-roja/4.webp,tetra-priestrella-roja/5.webp,tetra-priestrella-roja/6.webp', 'tetra-priestrella-roja/1.mp4', 'Activo', false)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM peces WHERE peces.nombre_comun = v.column1);

-- 3. Catalogar para Ecopia
INSERT INTO catalogo_productos_proveedor (pez_id, proveedor_id, precio_unitario, disponibilidad, eliminado)
SELECT p.id, pr.id, NULL, 'Disponible', false
FROM peces p, proveedores pr
WHERE pr.nombre_completo = 'Ecopia'
  AND NOT EXISTS (
    SELECT 1 FROM catalogo_productos_proveedor cp
    WHERE cp.pez_id = p.id AND cp.proveedor_id = pr.id
  );

COMMIT;
