const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticate } = require('../middleware/authMiddleware');

router.get(
  '/',
  authenticate,
  deviceController.getDevices
);

router.get(
  '/:deviceId',
  authenticate,
  deviceController.getDevice
);

router.post(
  '/:deviceId/trust',
  authenticate,
  deviceController.trustDevice
);

router.post(
  '/:deviceId/untrust',
  authenticate,
  deviceController.untrustDevice
);

router.delete(
  '/:deviceId',
  authenticate,
  deviceController.removeDevice
);

router.patch(
  '/:deviceId/name',
  authenticate,
  deviceController.renameDevice
);

module.exports = router;
