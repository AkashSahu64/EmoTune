const deviceService = require('../services/deviceService');
const IdentityError = require('../errors/IdentityError');

const deviceController = {
  async getDevices(req, res, next) {
    try {
      const devices = await deviceService.getUserDevices(req.user.id);
      res.json({
        success: true,
        data: { devices },
      });
    } catch (error) {
      next(error);
    }
  },

  async getDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND',
        });
      }

      if (device.user.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }

      res.json({
        success: true,
        data: { device },
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async trustDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND',
        });
      }

      if (device.user.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }

      await deviceService.trustDevice(deviceId, req.user.id);

      res.json({
        success: true,
        message: 'Device trusted successfully',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async untrustDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND',
        });
      }

      if (device.user.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }

      await deviceService.untrustDevice(deviceId, req.user.id);

      res.json({
        success: true,
        message: 'Device untrusted',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async removeDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND',
        });
      }

      if (device.user.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }

      await deviceService.removeDevice(deviceId, req.user.id);

      res.json({
        success: true,
        message: 'Device removed successfully',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async renameDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const { deviceName } = req.body;

      if (!deviceName || deviceName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Device name is required',
          code: 'DEVICE_NAME_REQUIRED',
        });
      }

      const device = await deviceService.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND',
        });
      }

      if (device.user.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }

      await deviceService.renameDevice(deviceId, deviceName.trim());

      res.json({
        success: true,
        message: 'Device renamed successfully',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },
};

module.exports = deviceController;
