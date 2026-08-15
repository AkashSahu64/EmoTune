const User = require('../models/User');
const { personaSchema } = require('../utils/validators');
const logger = require('../utils/logger');

exports.createPersona = async (req, res) => {
  try {
    const { error, value } = personaSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await User.findById(req.userId);
    if (user.personas.length >= 5) {
      return res.status(400).json({ error: 'Maximum 5 personas allowed' });
    }

    user.personas.push(value);
    await user.save();

    res.status(201).json({ personas: user.personas });
  } catch (err) {
    logger.error('Create persona error', { error: err.message });
    res.status(500).json({ error: 'Failed to create persona' });
  }
};

exports.getPersonas = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ personas: user.personas });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch personas' });
  }
};

exports.updatePersona = async (req, res) => {
  try {
    const { personaId } = req.params;
    const updates = req.body;

    const user = await User.findById(req.userId);
    const persona = user.personas.id(personaId);
    if (!persona) return res.status(404).json({ error: 'Persona not found' });

    Object.assign(persona, updates);
    await user.save();

    res.json({ personas: user.personas });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update persona' });
  }
};

exports.deletePersona = async (req, res) => {
  try {
    const { personaId } = req.params;
    const user = await User.findById(req.userId);

    user.personas = user.personas.filter((p) => p._id.toString() !== personaId);
    await user.save();

    res.json({ personas: user.personas });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete persona' });
  }
};

exports.setActivePersona = async (req, res) => {
  try {
    const { personaId } = req.params;
    const user = await User.findById(req.userId);

    user.personas.forEach((p) => {
      p.isActive = p._id.toString() === personaId;
    });

    await user.save();
    res.json({ personas: user.personas });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set active persona' });
  }
};
