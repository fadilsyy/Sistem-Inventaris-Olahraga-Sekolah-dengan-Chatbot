const dashboardService = require('../services/dashboardService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getDashboardSummary();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Ringkasan dashboard inventaris berhasil diambil.',
    data: summary
  });
});

module.exports = {
  getSummary
};