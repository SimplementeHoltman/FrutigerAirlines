// Middleware para estandarizar respuestas de la API sin cambiar la forma de los datos existentes
// Uso:
//   res.ok('Mensaje', 'CODE', { usuario }) -> { success: true, message, code, usuario }
//   res.fail('Mensaje', 'CODE', 400, { fieldErrors }) -> { success: false, message, code, fieldErrors }

export const responseFormatter = (req, res, next) => {
  res.ok = (message = '', code = 'OK', payload = {}, status = 200) => {
    const body = { success: true, message, code, ...payload };
    return res.status(status).json(body);
  };

  res.fail = (message = 'Solicitud inválida', code = 'ERROR', status = 400, extra = {}) => {
    const body = { success: false, message, code, ...extra };
    return res.status(status).json(body);
  };

  next();
};

export default responseFormatter;