const chatbotService = require('../services/chatbotService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

const getAssistantOptions = asyncHandler(async (req, res) => {
  const options = chatbotService.getPublicChatOptions();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Daftar opsi asisten inventaris berhasil dimuat.',
    data: options
  });
});

const askAssistant = asyncHandler(async (req, res) => {
  const { message, model, reasoning } = req.body;
  const reply = await chatbotService.generateAssistantReply(message, {
    model,
    reasoning,
    clientIp: req.ip
  });
  const result = { reply };

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Respons asisten inventaris berhasil dibuat.',
    data: result
  });
});

module.exports = {
  getAssistantOptions,
  askAssistant
};