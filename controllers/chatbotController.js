const chatbotService = require('../services/chatbotService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

const askAssistant = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const result = await chatbotService.generateReply(message, req.user);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Respons asisten inventaris berhasil dibuat.',
    data: result
  });
});

module.exports = {
  askAssistant
};