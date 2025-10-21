-- Poblar la tabla de asientos
INSERT INTO asientos (numero_asiento, clase_asiento) VALUES
('I1', 'Negocios'), ('I2', 'Negocios'),
('G1', 'Negocios'), ('G2', 'Negocios'),
('F1', 'Negocios'), ('F2', 'Negocios'),
('D1', 'Negocios'), ('D2', 'Negocios'),
('C1', 'Negocios'), ('C2', 'Negocios'),
('A1', 'Negocios'), ('A2', 'Negocios'),
('I3', 'Economica'), ('I4', 'Economica'), ('I5', 'Economica'), ('I6', 'Economica'), ('I7', 'Economica'),
('H3', 'Economica'), ('H4', 'Economica'), ('H5', 'Economica'), ('H6', 'Economica'), ('H7', 'Economica'),
('G3', 'Economica'), ('G4', 'Economica'), ('G5', 'Economica'), ('G6', 'Economica'), ('G7', 'Economica'),
('F3', 'Economica'), ('F4', 'Economica'), ('F5', 'Economica'), ('F6', 'Economica'), ('F7', 'Economica'),
('E3', 'Economica'), ('E4', 'Economica'), ('E5', 'Economica'), ('E6', 'Economica'), ('E7', 'Economica'),
('D3', 'Economica'), ('D4', 'Economica'), ('D5', 'Economica'), ('D6', 'Economica'), ('D7', 'Economica'),
('C3', 'Economica'), ('C4', 'Economica'), ('C5', 'Economica'), ('C6', 'Economica'), ('C7', 'Economica'),
('B3', 'Economica'), ('B4', 'Economica'), ('B5', 'Economica'), ('B6', 'Economica'), ('B7', 'Economica'),
('A3', 'Economica'), ('A4', 'Economica'), ('A5', 'Economica'), ('A6', 'Economica'), ('A7', 'Economica');

-- Poblar departamentos (Basado en CUIs de ejemplo XML)
-- 2548985620101 -> Dept 01, Muni 01
-- 1985455890201 -> Dept 02, Muni 01
-- 3012789450301 -> Dept 03, Muni 01
INSERT INTO departamentos (codigo, nombre) VALUES
('01', 'Guatemala'),
('02', 'El Progreso'),
('03', 'Sacatepéquez');
-- Añade los 19 restantes si los necesitas...

-- Poblar municipios
INSERT INTO municipios (departamento_id, codigo, nombre) VALUES
((SELECT departamento_id FROM departamentos WHERE codigo = '01'), '01', 'Guatemala'),
((SELECT departamento_id FROM departamentos WHERE codigo = '02'), '01', 'Guastatoya'),
((SELECT departamento_id FROM departamentos WHERE codigo = '03'), '01', 'Antigua Guatemala');
-- Añade los demás municipios...

