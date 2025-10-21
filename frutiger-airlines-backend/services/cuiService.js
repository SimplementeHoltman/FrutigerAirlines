import { query } from '../db.js';

/**
 * Valida un CUI contra la base de datos.
 * @param {string} cui - El número de CUI de 13 dígitos.
 * @returns {Promise<object>} - Objeto con { valido: boolean, mensaje: string, departamento: string, municipio: string }
 */
export const validarCUI = async (cui) => {
  if (!cui || cui.length !== 13 || !/^\d+$/.test(cui)) {
    return { valido: false, mensaje: 'Error: El CUI debe contener exactamente 13 dígitos numéricos.' };
  }

  // Extraer códigos (posiciones 9-10 para depto, 11-12 para muni)
  // JS substring es 0-indexado: substring(inicio, fin-no-incluido)
  const departamentoCodigo = cui.substring(9, 11);
  const municipioCodigo = cui.substring(11, 13);

  try {
    // 1. Validar departamento
    const deptoRes = await query('SELECT nombre FROM departamentos WHERE codigo = $1', [departamentoCodigo]);
    if (deptoRes.rows.length === 0) {
      return { valido: false, mensaje: `Error: Código de departamento "${departamentoCodigo}" no existe.` };
    }
    const departamentoNombre = deptoRes.rows[0].nombre;

    // 2. Validar municipio en ese departamento
    const muniRes = await query(
      `SELECT m.nombre
       FROM municipios m
       JOIN departamentos d ON m.departamento_id = d.departamento_id
       WHERE d.codigo = $1 AND m.codigo = $2`,
      [departamentoCodigo, municipioCodigo]
    );

    if (muniRes.rows.length === 0) {
      return { valido: false, mensaje: `Error: Código de municipio "${municipioCodigo}" no existe en el departamento "${departamentoCodigo}".` };
    }
    const municipioNombre = muniRes.rows[0].nombre;

    // Si pasa todas las validaciones
    return {
      valido: true,
      mensaje: 'CUI válido.',
      departamento: departamentoNombre,
      municipio: municipioNombre
    };

  } catch (error) {
    console.error('Error en validación CUI:', error);
    return { valido: false, mensaje: 'Error interno del servidor al validar CUI.' };
  }
};
