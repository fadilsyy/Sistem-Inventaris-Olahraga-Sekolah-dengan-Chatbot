function sendSuccess(res, { statusCode = 200, message = 'Permintaan berhasil diproses', data = null, meta = null } = {}) {
  const responseBody = {
    success: true,
    message
  };

  if (data !== null) {
    responseBody.data = data;
  }

  if (meta !== null) {
    responseBody.meta = meta;
  }

  return res.status(statusCode).json(responseBody);
}

module.exports = {
  sendSuccess
};